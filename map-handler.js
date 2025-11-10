// ===========================
// 百度地图处理模块(动态加载版)
// ===========================

let baiduMap = null;
let mapMarkers = [];
let mapPolyline = null;
let isMapInitialized = false;

// 初始化地图
function initMap() {
  console.log('初始化百度地图...');
  
  // 检查百度地图API是否加载
  if (typeof BMap === 'undefined') {
    console.warn('⚠️ 百度地图API未加载');
    
    // 检查是否配置了API Key
    const apiKey = window.CONFIG?.BAIDU_MAP_KEY || localStorage.getItem('baidu_map_key');
    if (!apiKey) {
      console.error('❌ 未配置百度地图API Key，请在设置中配置');
      showMapPlaceholder('请在设置中配置百度地图API Key');
      return false;
    }
    
    console.log('尝试加载百度地图API...');
    return false;
  }
  
  // 检查地图容器是否存在
  const mapContainer = document.getElementById('map-container');
  if (!mapContainer) {
    console.error('❌ 未找到地图容器元素 #map-container');
    return false;
  }
  
  try {
    // 创建地图实例
    baiduMap = new BMap.Map('map-container');
    
    // 设置中心点和缩放级别（默认：北京）
    const point = new BMap.Point(116.404, 39.915);
    baiduMap.centerAndZoom(point, 12);
    
    // 启用滚轮缩放
    baiduMap.enableScrollWheelZoom(true);
    
    // 添加地图控件
    baiduMap.addControl(new BMap.NavigationControl());     // 平移缩放控件
    baiduMap.addControl(new BMap.ScaleControl());          // 比例尺控件
    baiduMap.addControl(new BMap.OverviewMapControl());    // 缩略图控件
    
    isMapInitialized = true;
    console.log('✅ 百度地图初始化成功');
    return true;
  } catch (error) {
    console.error('❌ 百度地图初始化失败:', error);
    return false;
  }
}

// 显示地图占位符
function showMapPlaceholder(message) {
  const mapContainer = document.getElementById('map-container');
  if (mapContainer) {
    mapContainer.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; color: #666; font-size: 14px; text-align: center; padding: 20px;">
        <div>
          <div style="font-size: 48px; margin-bottom: 10px;">🗺️</div>
          <p>${message}</p>
          <button onclick="openSettings()" style="margin-top: 15px; padding: 8px 20px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-family: inherit;">
            去设置
          </button>
        </div>
      </div>
    `;
  }
}

// 显示目的地位置
function showDestinationOnMap(destination) {
  if (!isMapInitialized || !baiduMap) {
    console.log('地图未初始化，尝试初始化...');
    if (!initMap()) {
      return;
    }
  }
  
  console.log('在地图上显示目的地:', destination);
  
  // 创建地理编码器
  const geocoder = new BMap.Geocoder();
  
  // 地理编码
  geocoder.getPoint(destination, function(point) {
    if (point) {
      console.log('✅ 找到目的地坐标:', point);
      
      // 清除旧标记
      clearMapMarkers();
      
      // 设置地图中心
      baiduMap.centerAndZoom(point, 12);
      
      // 添加标记
      const marker = new BMap.Marker(point);
      baiduMap.addOverlay(marker);
      mapMarkers.push(marker);
      
      // 添加信息窗口
      const infoWindow = new BMap.InfoWindow(
        `<div style="padding:10px;">
          <strong>${destination}</strong>
        </div>`,
        {
          width: 200,
          height: 50,
          title: '目的地'
        }
      );
      
      marker.addEventListener('click', function() {
        baiduMap.openInfoWindow(infoWindow, point);
      });
      
      // 自动打开信息窗口
      baiduMap.openInfoWindow(infoWindow, point);
    } else {
      console.error('❌ 未找到该地点:', destination);
      alert('未找到该地点，请输入更详细的地址');
    }
  }, destination);
}

// 在地图上显示旅行路线
function displayTravelRoute(planData) {
  if (!isMapInitialized || !baiduMap) {
    console.log('地图未初始化，尝试初始化...');
    if (!initMap()) {
      return;
    }
  }
  
  console.log('在地图上显示旅行路线');
  
  // 清除旧标记和路线
  clearMapMarkers();
  clearMapPolyline();
  
  // 从计划数据中提取景点
  const attractions = extractAttractionsFromPlan(planData);
  console.log('提取到的景点:', attractions);
  
  if (attractions.length === 0) {
    console.log('未找到景点信息，只显示目的地');
    if (planData.destination) {
      showDestinationOnMap(planData.destination);
    }
    return;
  }
  
  // 批量地理编码景点
  geocodeAttractions(attractions, planData.destination);
}

// 从计划数据中提取景点名称
function extractAttractionsFromPlan(planData) {
  const attractions = new Set(); // 使用Set避免重复
  
  // 从每日行程中提取景点
  if (planData.itinerary && Array.isArray(planData.itinerary)) {
    planData.itinerary.forEach(day => {
      if (day.activities && Array.isArray(day.activities)) {
        day.activities.forEach(activity => {
          if (activity.location) {
            const location = activity.location.trim();
            // 过滤掉过短或过长的名称
            if (location.length > 1 && location.length < 20) {
              attractions.add(location);
            }
          }
        });
      }
    });
  }
  
  // 也可以尝试从原始文本中提取
  if (planData.rawText) {
    const extracted = extractAttractionsFromText(planData.rawText);
    extracted.forEach(attr => attractions.add(attr));
  }
  
  return Array.from(attractions).slice(0, 10); // 最多10个景点
}

// 从文本中提取景点名称
function extractAttractionsFromText(text) {
  const attractions = [];
  
  // 匹配常见的景点模式
  const patterns = [
    /[•\-*]\s*([^：:\n]{2,20}?)(?=[：:\n]|$)/g,           // 项目符号后的内容
    /参观|游览|前往|到达\s*[：:]?\s*([^，,。.\n]{2,20})/g,   // 动词+景点
    /景点[：:]\s*([^，,。.\n]+)/g,                          // "景点："后的内容
    /\d+[\.、]\s*([^，,。.\n（(]{2,20})/g                  // 数字编号后的内容
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const attraction = match[1]
        .trim()
        .replace(/^\(|\)$/g, '')    // 移除括号
        .replace(/^【|】$/g, '')    // 移除方括号
        .replace(/\s+/g, '');       // 移除空格
      
      // 过滤条件
      if (attraction.length > 1 && 
          attraction.length < 20 && 
          !attractions.includes(attraction) &&
          !attraction.match(/^\d+$/) &&           // 排除纯数字
          !attraction.match(/^第.*天$/) &&        // 排除"第X天"
          !attraction.match(/^[0-9]+:[0-9]+$/)) { // 排除时间
        attractions.push(attraction);
      }
    }
  }
  
  return attractions;
}

// 批量地理编码景点
function geocodeAttractions(attractions, city) {
  console.log('批量地理编码景点:', attractions);
  
  const geocoder = new BMap.Geocoder();
  const locations = [];
  let processedCount = 0;
  
  // 获取城市名称作为搜索范围
  const searchCity = city ? city.replace(/市|省|区|县/g, '') : '';
  
  attractions.forEach((attraction, index) => {
    // 组合完整地址
    const fullAddress = searchCity ? `${searchCity}${attraction}` : attraction;
    
    geocoder.getPoint(fullAddress, function(point) {
      processedCount++;
      
      if (point) {
        locations.push({
          name: attraction,
          position: point,
          index: index
        });
        console.log(`✅ 景点 ${attraction} 编码成功`);
      } else {
        console.warn(`⚠️ 景点 ${attraction} 编码失败`);
      }
      
      // 所有景点处理完成
      if (processedCount === attractions.length) {
        if (locations.length > 0) {
          addMarkersAndRoute(locations);
        } else {
          console.log('所有景点编码失败，显示目的地');
          if (city) {
            showDestinationOnMap(city);
          }
        }
      }
    }, searchCity);
  });
}

// 添加标记和路线到地图
function addMarkersAndRoute(locations) {
  console.log('添加标记和路线到地图:', locations);
  
  if (locations.length === 0) {
    console.log('没有有效的位置信息');
    return;
  }
  
  // 按索引排序
  locations.sort((a, b) => a.index - b.index);
  
  // 创建路线点数组
  const points = [];
  
  // 添加标记
  locations.forEach((loc, index) => {
    points.push(loc.position);
    
    // 创建自定义标签（带数字）
    const label = new BMap.Label(`${index + 1}`, {
      offset: new BMap.Size(-6, -20)
    });
    label.setStyle({
      backgroundColor: '#4A90E2',
      color: 'white',
      border: '2px solid white',
      borderRadius: '50%',
      width: '20px',
      height: '20px',
      lineHeight: '20px',
      textAlign: 'center',
      fontSize: '12px',
      fontWeight: 'bold'
    });
    
    // 创建标记
    const marker = new BMap.Marker(loc.position);
    marker.setLabel(label);
    
    // 添加信息窗口
    const infoWindow = new BMap.InfoWindow(
      `<div style="padding:5px;">
        <strong>${index + 1}. ${loc.name}</strong>
      </div>`,
      {
        width: 200,
        height: 50
      }
    );
    
    marker.addEventListener('click', function() {
      baiduMap.openInfoWindow(infoWindow, loc.position);
    });
    
    baiduMap.addOverlay(marker);
    mapMarkers.push(marker);
  });
  
  // 绘制路线
  if (locations.length > 1) {
    mapPolyline = new BMap.Polyline(points, {
      strokeColor: '#4A90E2',
      strokeWeight: 5,
      strokeOpacity: 0.8
    });
    
    baiduMap.addOverlay(mapPolyline);
  }
  
  // 调整视野以显示所有标记
  if (points.length > 0) {
    const viewport = baiduMap.getViewport(points);
    baiduMap.centerAndZoom(viewport.center, viewport.zoom);
  }
}

// 清除所有标记
function clearMapMarkers() {
  if (mapMarkers.length > 0) {
    mapMarkers.forEach(marker => {
      baiduMap.removeOverlay(marker);
    });
    mapMarkers = [];
    console.log('已清除所有标记');
  }
}

// 清除路线
function clearMapPolyline() {
  if (mapPolyline) {
    baiduMap.removeOverlay(mapPolyline);
    mapPolyline = null;
    console.log('已清除路线');
  }
}

// 清除地图上的所有内容
function clearMap() {
  clearMapMarkers();
  clearMapPolyline();
}

// 监听目的地输入框变化，实时更新地图
function setupDestinationListener() {
  const destinationInput = document.getElementById('destination');
  if (destinationInput) {
    // 防抖处理
    let timeout;
    destinationInput.addEventListener('input', function() {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const destination = this.value.trim();
        if (destination.length > 1 && isMapInitialized) {
          showDestinationOnMap(destination);
        }
      }, 1000); // 1秒后更新
    });
    console.log('✅ 已设置目的地输入监听器');
  }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
      // 只有在配置了API Key时才尝试初始化
      const apiKey = window.CONFIG?.BAIDU_MAP_KEY || localStorage.getItem('baidu_map_key');
      if (apiKey && typeof BMap !== 'undefined') {
        initMap();
      } else if (!apiKey) {
        showMapPlaceholder('请在设置中配置百度地图API Key');
      }
      setupDestinationListener();
    }, 500);
  });
} else {
  setTimeout(() => {
    const apiKey = window.CONFIG?.BAIDU_MAP_KEY || localStorage.getItem('baidu_map_key');
    if (apiKey && typeof BMap !== 'undefined') {
      initMap();
    } else if (!apiKey) {
      showMapPlaceholder('请在设置中配置百度地图API Key');
    }
    setupDestinationListener();
  }, 500);
}

console.log('✅ map-handler.js 已加载');