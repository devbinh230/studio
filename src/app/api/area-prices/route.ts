import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import * as querystring from 'querystring';

// Environment variables / tokens
const GEO_API_KEY = process.env.GEOAPIFY_API_KEY as string;
// NOTE: Using a fixed fallback token in case env not set (should be replaced in production)
const CAFELAND_TOKEN = process.env.CAFELAND_TOKEN as string;
const US1_KEY = process.env.US1_KEY as string;
const GOONG_KEY = process.env.GOONG_KEY as string;
const GOONG_COOKIE = process.env.GOONG_COOKIE as string;
// Helper to reverse-geocode lat/lng to human readable address string accepted by Cafeland
async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const url = `https://maps.goong.io/api/goong/geocode?latlng=${lat},${lon}&api_key=${GOONG_KEY}`;

  const  headers = { 
    'accept': 'application/json, text/plain, */*', 
    'accept-language': 'en-US,en;q=0.9,vi;q=0.8', 
    'cache-control': 'no-cache', 
    'pragma': 'no-cache', 
    'priority': 'u=1, i', 
    'referer': 'https://maps.goong.io/', 
    'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"', 
    'sec-ch-ua-mobile': '?0', 
    'sec-ch-ua-platform': '"Windows"', 
    'sec-fetch-dest': 'empty', 
    'sec-fetch-mode': 'cors', 
    'sec-fetch-site': 'same-origin', 
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', 
    'Cookie': GOONG_COOKIE,  
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Lỗi Goong API: ${response.status} - ${await response.text()}`);
  }

  const data = await response.json() as any;
  console.log('data', data);
  if (!data.results || data.results.length === 0 || data.status !== 'OK') {
    throw new Error('Không tìm thấy kết quả geocoding hoặc yêu cầu không thành công.');
  }
  
  let rawAddress = data.results[0].address || 'N/A';
  console.log('rawAddress', rawAddress);
  
  // Đếm số dấu phẩy trong rawAddress
  const commaCount = (rawAddress.match(/,/g) || []).length;
  
  let formatted_address;
  if (rawAddress === 'N/A') {
    formatted_address = 'N/A';
  } else if (commaCount <= 2) {
    // Nếu rawAddress có đúng 2 dấu phẩy, lấy formatted_address từ data.results[0].formatted_address
    formatted_address = data.results[0].formatted_address || 'N/A';
    formatted_address = formatted_address.replace(/Đ\./g, 'Đường').replace(/^\d+\s*/, '');
 
    formatted_address = formatted_address.replace(/(Quận|Thành Phố|Phố|Phường|Đường)\s*/gi, '').replace(/\s*,\s*/g, ', ').replace(/^,|,$/g, '').trim();
  } else {
    // Thay thế Đ. thành Đường
    rawAddress = rawAddress.replace(/Đ\./g, 'Đường');
    // Loại bỏ số ở phía trước dấu phẩy đầu tiên
    rawAddress = rawAddress.replace(/^\d+\s*/, '');
    const match = rawAddress.match(/Đường\s+([^,]+),(.+)/);
    if (match) {
      // Trường hợp có "Đường"
      formatted_address = `${match[1]},${match[2]}`.replace(/(Quận|Thành Phố|Phố|Phường|Đường)\s*/gi, '').replace(/\s*,\s*/g, ', ').replace(/^,|,$/g, '').trim();
    } else {
      // Trường hợp không có "Đường"
      formatted_address = rawAddress.replace(/(Quận|Thành Phố|Phố|Phường|Đường)\s*/gi, '').replace(/\s*,\s*/g, ', ').replace(/^,|,$/g, '').trim();
    }
  }
  
  console.log('formatted_address', formatted_address);
  return formatted_address;
}

// POST to Cafeland suggestion API and return list of hrefs
async function fetchCafelandHrefs(keyword: string): Promise<string[]> {
  const body = querystring.stringify({ keysearch: keyword, _token: CAFELAND_TOKEN });
  const res = await fetch('https://nhadat.cafeland.vn/ajax/listgoiysearchdg', {
    method: 'POST',
    headers: {
      'User-Agent': 'next-app/1.0',
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      Referer: 'https://nhadat.cafeland.vn/',
    },
    body,
  });
  if (!res.ok) throw new Error(`Cafeland API error ${res.status}`);

  const html = await res.text();
  const dom = new JSDOM(html);
  const links = Array.from(dom.window.document.querySelectorAll('div.tim-khu-vuc-dg ul li a')) as HTMLAnchorElement[];

  // So sánh textContent của span trong mỗi href với keyword, chọn href khớp nhiều nhất
  let bestHref: string | null = null;
  let maxMatch = 0;
  for (const a of links) {
    const span = a.querySelector('span');
    if (!span) continue;
    const spanText = span.textContent?.toLowerCase() || '';
    const keywordLower = keyword.toLowerCase();
    // Đếm số ký tự liên tiếp khớp từ đầu
    let matchCount = 0;
    for (let i = 0; i < Math.min(spanText.length, keywordLower.length); i++) {
      if (spanText[i] === keywordLower[i]) matchCount++;
      else break;
    }
    if (matchCount > maxMatch) {
      maxMatch = matchCount;
      bestHref = a.getAttribute('href') || '';
    }
    // Nếu matchCount == maxMatch, giữ lại href đầu tiên (không thay đổi bestHref)
  }
  if (bestHref) return [bestHref];
  // Nếu không có span nào khớp, fallback trả về tất cả href như cũ
  return links.map((l) => l.getAttribute('href') || '').filter(Boolean);
}

// Extract price table from Cafeland detail page
async function fetchPriceTable(href: string): Promise<Record<string, string>> {
  const res = await fetch(`https://nhadat.cafeland.vn${href}`, {
    headers: {
      'User-Agent': 'next-app/1.0',
      Referer: 'https://nhadat.cafeland.vn/',
    },
  });
  if (!res.ok) throw new Error(`Cafeland detail page error ${res.status}`);

  const html = await res.text();
  const dom = new JSDOM(html);
  const result: Record<string, string> = {};

  // 1) Bảng giá chi tiết (đường, hẻm ...)
  const tableRows = dom.window.document.querySelectorAll('table.tablePriceList tbody tr');
  tableRows.forEach((row: Element) => {
    const name = row.querySelector('td span')?.textContent?.trim() || '';
    const price = row.querySelector('td.text-right span b')?.textContent?.trim() || '';
    if (name && price) result[name] = price;
  });

  // 2) Khối tiêu đề định giá trung bình
  dom.window.document.querySelectorAll('div.check-dinhgia-tieude').forEach((el: Element) => {
    const title = el.querySelector('p.tieude-omae')?.textContent?.trim() || '';
    const price = el.querySelector('p.tieude-price')?.textContent?.trim() || '';
    if (title && price) result[title] = price;
  });

  // 3) Các box-home-dinh (thấp nhất, cao nhất, phường...)
  dom.window.document.querySelectorAll('div.box-home-dinh').forEach((el: Element) => {
    const label = el.querySelector('span')?.textContent?.trim() || '';
    const priceValue = el.querySelector('span.bot-bold-left')?.textContent?.trim() || '';
    if (label && priceValue) result[label] = priceValue + ' đ/m2';
  });

  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ success: false, error: 'Missing or invalid lat/lng' }, { status: 400 });
    }

    // 1. Reverse geocode to get address keyword
    const keyword = await reverseGeocode(lat, lng);

    // 2. Fetch Cafeland suggestion links
    const hrefs = await fetchCafelandHrefs(keyword);
    if (hrefs.length === 0) {
      return NextResponse.json({ success: true, data: {} });
    }

    // 3. Fetch each detail page in parallel & aggregate
    const priceTables = await Promise.all(hrefs.map(fetchPriceTable));
    const aggregated: Record<string, string> = {};
    priceTables.forEach((tbl) => Object.assign(aggregated, tbl));
    console.log('aggregated', aggregated);
    return NextResponse.json({ success: true, data: aggregated });
  } catch (err: any) {
    console.error('area-prices API error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal error' }, { status: 500 });
  }
} 
