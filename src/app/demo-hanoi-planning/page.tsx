'use client';

import dynamic from 'next/dynamic';

const HanoiPlanningMap = dynamic(() => import("@/components/hanoi-planning-map"), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
    <p className="text-gray-500">Đang tải bản đồ...</p>
  </div>
});

export default function HanoiPlanningDemo() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bản đồ Quy hoạch Hà Nội 2030
          </h1>          <p className="text-gray-600">
            Hiển thị bản đồ với 3 layer: Base map Geoapify, quy hoạch Hà Nội 2030 và bản đồ đất đai. 
            <strong> Click vào bản đồ để xem thông tin quy hoạch chi tiết.</strong>
          </p>
        </div>

        <div className="grid gap-8">
          {/* Instructions */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-lg p-6 border border-blue-200">
            <h2 className="text-xl font-semibold mb-4 text-blue-800">📍 Hướng dẫn sử dụng</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                  <div>
                    <h3 className="font-semibold text-blue-700">Click vào bản đồ</h3>
                    <p className="text-sm text-blue-600">Nhấp chuột vào vị trí bất kỳ trên bản đồ để xem thông tin quy hoạch</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                  <div>
                    <h3 className="font-semibold text-blue-700">Xem polygon</h3>
                    <p className="text-sm text-blue-600">Khu vực quy hoạch sẽ được hiển thị bằng polygon màu đỏ</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                  <div>
                    <h3 className="font-semibold text-blue-700">Đọc thông tin</h3>
                    <p className="text-sm text-blue-600">Thông tin chi tiết sẽ hiển thị bên dưới bản đồ</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                  <div>
                    <h3 className="font-semibold text-blue-700">Phân tích dữ liệu</h3>
                    <p className="text-sm text-blue-600">Xem diện tích, loại đất và thông tin quy hoạch</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Map */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">🗺️ Bản đồ Interactive</h2>
            <HanoiPlanningMap 
              height="600px"
              showControls={true}
              className="border-2 border-gray-200"
            />
          </div>          {/* Information Panel */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Thông tin Bản đồ</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-3">Base Map: Geoapify</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Bản đồ nền OSM Bright style</li>
                  <li>• Hiển thị đường phố và địa hình cơ bản</li>
                  <li>• Cung cấp ngữ cảnh địa lý</li>
                  <li>• Hỗ trợ zoom cao đến level 18</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-3">Layer 1: Bản đồ Quy hoạch 2030</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Bản đồ quy hoạch tổng thể Hà Nội đến năm 2030</li>
                  <li>• Hiển thị các khu vực quy hoạch đô thị</li>
                  <li>• Thông tin về phân vùng chức năng</li>
                  <li>• Dự án phát triển cơ sở hạ tầng</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-3">Layer 2: Bản đồ Đất đai</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Thông tin hiện trạng sử dụng đất</li>
                  <li>• Phân loại đất theo mục đích sử dụng</li>
                  <li>• Ranh giới các thửa đất</li>
                  <li>• Thông tin quyền sở hữu đất</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Demo Locations */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Địa điểm Demo</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  name: "Hồ Hoàn Kiếm",
                  coords: "21.0285, 105.8542",
                  description: "Trung tâm lịch sử Hà Nội"
                },
                {
                  name: "Nhà thờ Đức Bà",
                  coords: "21.0245, 105.8412",
                  description: "Công trình kiến trúc Gothic"
                },
                {
                  name: "Lăng Chủ tịch Hồ Chí Minh",
                  coords: "21.0367, 105.8349",
                  description: "Lăng Bác Hồ"
                },
                {
                  name: "Chùa Một Cột",
                  coords: "21.0458, 105.8019",
                  description: "Di tích lịch sử"
                }
              ].map((location, index) => (
                <div key={index} className="p-4 border rounded-lg bg-gray-50">
                  <h3 className="font-semibold text-sm mb-1">{location.name}</h3>
                  <p className="text-xs text-gray-600 mb-2">{location.description}</p>
                  <p className="text-xs text-blue-600 font-mono">{location.coords}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Technical Info */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Thông tin Kỹ thuật</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>                <h3 className="font-semibold mb-2">Cấu hình Tile Layers</h3>
                <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                  <p className="mb-2">
                    <span className="text-purple-600">Base Map:</span><br/>
                    https://maps.geoapify.com/v1/tile/osm-bright/{`{z}`}/{`{x}`}/{`{y}`}.png?apiKey=[API_KEY]
                  </p>
                  <p className="mb-2">
                    <span className="text-blue-600">Layer 1:</span><br/>
                    https://l5cfglaebpobj.vcdn.cloud/ha-noi-2030-2/{`{z}`}/{`{x}`}/{`{y}`}.png
                  </p>
                  <p>
                    <span className="text-green-600">Layer 2:</span><br/>
                    https://s3-hn-2.cloud.cmctelecom.vn/guland7/land/ha-noi/{`{z}`}/{`{x}`}/{`{y}`}.png
                  </p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Thông số Bản đồ</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• <strong>Hệ tọa độ:</strong> WGS84 (EPSG:4326)</li>
                  <li>• <strong>Tile Size:</strong> 256x256 pixels</li>
                  <li>• <strong>Zoom Level:</strong> 0-18</li>
                  <li>• <strong>Projection:</strong> Web Mercator</li>
                  <li>• <strong>Format:</strong> PNG</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
