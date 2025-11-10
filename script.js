// ===========================
// 全局变量
// ===========================
let isListening = false;
let recognition = null;
let currentPlanData = null; // 存储当前生成的计划

// ===========================
// 初始化
// ===========================
document.addEventListener('DOMContentLoaded', function() {
  console.log('✅ 应用初始化完成');
  loadConfig();
  
  // 初始化语音识别
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = function(event) {
      const transcript = event.results[0][0].transcript;
      document.getElementById('voice-result').textContent = `识别结果: ${transcript}`;
      
      // 智能填充表单
      parseVoiceInput(transcript);
    };

    recognition.onerror = function(event) {
      console.error('语音识别错误:', event.error);
      document.getElementById('voice-status').textContent = '识别失败，请重试';
      stopListening();
    };

    recognition.onend = function() {
      stopListening();
    };
  }
});

// ===========================
// 配置管理
// ===========================
function loadConfig() {
  const savedApiKey = localStorage.getItem('dashscope_api_key');
  const savedSupabaseUrl = localStorage.getItem('supabase_url');
  const savedSupabaseKey = localStorage.getItem('supabase_anon_key');
  const savedBaiduMapKey = localStorage.getItem('baidu_map_key');
  
  if (savedApiKey) {
    window.CONFIG.DASHSCOPE_API_KEY = savedApiKey;
    console.log('✅ 已加载阿里云API Key');
  }
  if (savedSupabaseUrl) {
    window.CONFIG.SUPABASE_URL = savedSupabaseUrl;
    console.log('✅ 已加载Supabase URL');
  }
  if (savedSupabaseKey) {
    window.CONFIG.SUPABASE_ANON_KEY = savedSupabaseKey;
    console.log('✅ 已加载Supabase Key');
  }
  if (savedBaiduMapKey) {
    window.CONFIG.BAIDU_MAP_KEY = savedBaiduMapKey;
    console.log('✅ 已加载百度地图API Key');
    // 动态加载百度地图API
    loadBaiduMapAPI(savedBaiduMapKey);
  } else {
    console.log('⚠️ 未配置百度地图API Key，地图功能将不可用');
  }
}

function openSettings() {
  document.getElementById('settings-modal').style.display = 'block';
  
  // 回显已保存的配置
  const savedApiKey = localStorage.getItem('dashscope_api_key');
  const savedSupabaseUrl = localStorage.getItem('supabase_url');
  const savedSupabaseKey = localStorage.getItem('supabase_anon_key');
  const savedBaiduMapKey = localStorage.getItem('baidu_map_key');
  
  if (savedApiKey) {
    document.getElementById('api-key-input').value = savedApiKey;
  }
  if (savedSupabaseUrl) {
    document.getElementById('supabase-url-input').value = savedSupabaseUrl;
  }
  if (savedSupabaseKey) {
    document.getElementById('supabase-key-input').value = savedSupabaseKey;
  }
  if (savedBaiduMapKey) {
    document.getElementById('baidu-map-key-input').value = savedBaiduMapKey;
  }
}

function closeSettings() {
  document.getElementById('settings-modal').style.display = 'none';
}

function saveSettings() {
  console.log('开始保存设置...');
  
  const apiKey = document.getElementById('api-key-input').value.trim();
  const supabaseUrl = document.getElementById('supabase-url-input').value.trim();
  const supabaseKey = document.getElementById('supabase-key-input').value.trim();
  
  // 百度地图配置
  const baiduMapKey = document.getElementById('baidu-map-key-input')?.value.trim();
  
  // 语音识别配置
  const xfyunAppId = document.getElementById('xfyun-appid-input')?.value.trim();
  const xfyunSecret = document.getElementById('xfyun-secret-input')?.value.trim();
  const xfyunKey = document.getElementById('xfyun-key-input')?.value.trim();
  
  // 地图配置
  const mapProvider = document.getElementById('map-provider-input')?.value;
  const mapKey = document.getElementById('map-key-input')?.value.trim();
  
  console.log('API Key:', apiKey ? '已填写' : '未填写');
  console.log('Supabase URL:', supabaseUrl ? '已填写' : '未填写');
  console.log('Supabase Key:', supabaseKey ? '已填写' : '未填写');
  console.log('百度地图 Key:', baiduMapKey ? '已填写' : '未填写');
  console.log('语音识别:', xfyunAppId ? '已配置' : '未配置');
  console.log('地图服务:', mapProvider, mapKey ? '已配置' : '未配置');
  
  if (!apiKey) {
    alert('请输入阿里云API Key');
    return;
  }
  
  // 保存到localStorage
  localStorage.setItem('dashscope_api_key', apiKey);
  window.CONFIG.DASHSCOPE_API_KEY = apiKey;
  console.log('✅ 已保存阿里云API Key');
  
  // 保存百度地图配置
  if (baiduMapKey) {
    localStorage.setItem('baidu_map_key', baiduMapKey);
    window.CONFIG.BAIDU_MAP_KEY = baiduMapKey;
    console.log('✅ 已保存百度地图API Key');
    
    // 重新加载百度地图API
    loadBaiduMapAPI(baiduMapKey);
  }
  
  // 保存语音识别配置
  if (xfyunAppId && xfyunSecret && xfyunKey) {
    localStorage.setItem('xfyun_appid', xfyunAppId);
    localStorage.setItem('xfyun_secret', xfyunSecret);
    localStorage.setItem('xfyun_key', xfyunKey);
    console.log('✅ 已保存科大讯飞配置');
  }
  
  // 保存地图配置
  if (mapProvider && mapKey) {
    localStorage.setItem('map_provider', mapProvider);
    localStorage.setItem('map_key', mapKey);
    console.log('✅ 已保存地图配置');
  }
  
  let supabaseConfigured = false;
  
  if (supabaseUrl && supabaseKey) {
    localStorage.setItem('supabase_url', supabaseUrl);
    localStorage.setItem('supabase_anon_key', supabaseKey);
    window.CONFIG.SUPABASE_URL = supabaseUrl;
    window.CONFIG.SUPABASE_ANON_KEY = supabaseKey;
    supabaseConfigured = true;
    console.log('✅ 已保存Supabase配置');
  }
  
  // 显示成功消息
  if (typeof showMessage === 'function') {
    showMessage('设置已保存！', 'success');
  } else {
    alert('设置已保存！');
  }
  
  console.log('✅ 设置保存成功');
  
  // 关闭设置窗口
  setTimeout(() => {
    closeSettings();
    
    // 如果Supabase配置完整,重新初始化
    if (supabaseConfigured && typeof initSupabase === 'function') {
      console.log('重新初始化Supabase...');
      initSupabase();
    }
    
    // 重新初始化语音识别
    if (typeof initVoiceRecognition === 'function') {
      initVoiceRecognition();
    }
    
    // 重新初始化地图
    if (typeof initMap === 'function' && baiduMapKey) {
      setTimeout(() => {
        initMap();
      }, 1000); // 等待API加载
    }
  }, 500);
}

// ===========================
// 语音输入
// ===========================
function toggleVoiceInput() {
  if (!recognition) {
    alert('您的浏览器不支持语音识别功能，请使用Chrome浏览器');
    return;
  }

  if (isListening) {
    recognition.stop();
  } else {
    recognition.start();
    startListening();
  }
}

function startListening() {
  isListening = true;
  const btn = document.getElementById('voice-btn');
  btn.classList.add('listening');
  btn.textContent = '🎤 正在听...';
  document.getElementById('voice-status').textContent = '请说话...';
  document.getElementById('voice-result').textContent = '';
}

function stopListening() {
  isListening = false;
  const btn = document.getElementById('voice-btn');
  btn.classList.remove('listening');
  btn.textContent = '🎤 点击语音输入';
  document.getElementById('voice-status').textContent = '';
}

// 智能解析语音输入
function parseVoiceInput(text) {
  console.log('解析语音输入:', text);
  
  // ========== 提取目的地 ==========
  const destinationPatterns = [
    /(?:去|到|想去|前往|游|玩)([^\d，,。\s]{2,10}?)(?=[，,。\s]|\d|$)/,
    /目的地(?:是|：|:)\s*([^\d，,。\s]+)/
  ];
  
  for (const pattern of destinationPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const destination = match[1].trim();
      document.getElementById('destination').value = destination;
      console.log('提取目的地:', destination);
      
      // 在地图上显示目的地
      if (typeof showDestinationOnMap === 'function') {
        setTimeout(() => showDestinationOnMap(destination), 500);
      }
      break;
    }
  }
  
  // ========== 提取天数 ==========
  const daysPatterns = [
    /([0-9零一二三四五六七八九十百]+)\s*(?:天|日)/,
    /天数(?:是|：|:)\s*([0-9]+)/
  ];
  
  for (const pattern of daysPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let days = match[1];
      // 转换中文数字
      const chineseNumbers = {
        '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
        '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
      };
      if (chineseNumbers[days]) {
        days = chineseNumbers[days];
      } else if (days === '两' || days === '俩') {
        days = 2;
      }
      document.getElementById('days').value = days;
      console.log('提取天数:', days);
      break;
    }
  }
  
  // ========== 提取预算 ==========
  const budgetPatterns = [
    /预算\s*(?:是|：|:)?\s*([0-9]+)\s*(?:元|块|万)?/,
    /([0-9]+)\s*(?:元|块|万)\s*预算/,
    /(?:花|用)\s*([0-9]+)\s*(?:元|块|万)?/
  ];
  
  for (const pattern of budgetPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let budget = parseInt(match[1]);
      // 如果提到"万"，乘以10000
      if (text.match(/\d+\s*万/)) {
        budget *= 10000;
      }
      document.getElementById('budget').value = budget;
      console.log('提取预算:', budget);
      break;
    }
  }
  
  // ========== 提取人数 ==========
  const travelersPatterns = [
    /([0-9零一二三四五六七八九十]+)\s*(?:个人|人|位)/,
    /人数(?:是|：|:)\s*([0-9]+)/
  ];
  
  for (const pattern of travelersPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let travelers = match[1];
      // 转换中文数字
      const chineseNumbers = {
        '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
        '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
      };
      if (chineseNumbers[travelers]) {
        travelers = chineseNumbers[travelers];
      } else if (travelers === '两' || travelers === '俩') {
        travelers = 2;
      }
      document.getElementById('travelers').value = travelers;
      console.log('提取人数:', travelers);
      break;
    }
  }
  
  // ========== 提取偏好 ==========
  const preferences = [];
  const preferenceKeywords = {
    '美食': ['美食', '吃', '餐厅', '小吃', '特色菜'],
    '文化': ['文化', '历史', '古迹', '博物馆', '寺庙', '遗产'],
    '自然': ['自然', '风景', '山', '海', '湖', '公园'],
    '购物': ['购物', '买', '商场', '逛街'],
    '亲子': ['孩子', '小孩', '儿童', '亲子', '家庭', '带娃'],
    '动漫': ['动漫', '二次元', 'ACG', '漫展'],
    '冒险': ['冒险', '刺激', '极限', '运动', '挑战'],
    '放松': ['放松', '休闲', '度假', '疗养'],
    '摄影': ['摄影', '拍照', '打卡'],
    '夜生活': ['夜生活', '酒吧', '夜店', '夜景']
  };
  
  for (const [preference, keywords] of Object.entries(preferenceKeywords)) {
    const hasKeyword = keywords.some(keyword => text.includes(keyword));
    if (hasKeyword && !preferences.includes(preference)) {
      preferences.push(preference);
    }
  }
  
  if (preferences.length > 0) {
    document.getElementById('preferences').value = preferences.join('、');
    console.log('提取偏好:', preferences);
  }
  
  console.log('✅ 语音输入解析完成');
}

// ===========================
// AI调用
// ===========================
async function generateTravelPlan() {
  // 获取表单数据
  const destination = document.getElementById('destination').value.trim();
  const days = parseInt(document.getElementById('days').value);
  const budget = parseInt(document.getElementById('budget').value);
  const travelers = parseInt(document.getElementById('travelers').value);
  const preferences = document.getElementById('preferences').value.trim();
  
  // 验证输入
  if (!destination || !days || !budget || !travelers) {
    alert('请填写完整的旅行信息');
    return;
  }
  
  // 检查API Key
  if (!window.CONFIG.DASHSCOPE_API_KEY) {
    alert('请先在设置中配置阿里云API Key');
    openSettings();
    return;
  }
  
  // 显示加载动画
  document.getElementById('loading').style.display = 'block';
  document.getElementById('result-container').style.display = 'none';
  
  // 构建提示词
  const prompt = `
作为一个专业的旅行规划师，请为以下需求制定详细的旅行计划：

目的地：${destination}
旅行天数：${days}天
预算：${budget}元
同行人数：${travelers}人
旅行偏好：${preferences || '无特殊偏好'}

请生成一个详细的旅行计划，包括：
1. 每日行程安排（包含具体时间、地点、活动）
2. 住宿建议（酒店名称、价格区间、位置）
3. 餐饮推荐（餐厅名称、特色菜品、预算）
4. 交通方式（城际交通和市内交通）
5. 预算明细（住宿、餐饮、交通、门票、其他）

请用JSON格式返回，确保是纯JSON，不要有任何其他文字说明。格式如下：
{
  "title": "旅行计划标题",
  "destination": "${destination}",
  "days": ${days},
  "budget": ${budget},
  "travelers": ${travelers},
  "itinerary": [
    {
      "day": 1,
      "date": "日期",
      "activities": [
        {"time": "09:00", "location": "地点", "activity": "活动描述", "cost": 100}
      ]
    }
  ],
  "accommodation": [
    {"name": "酒店名称", "type": "酒店类型", "pricePerNight": 500, "location": "位置", "nights": 2}
  ],
  "dining": [
    {"name": "餐厅名称", "cuisine": "菜系", "avgCost": 150, "recommendations": ["推荐菜品1", "推荐菜品2"]}
  ],
  "transportation": {
    "intercity": {"method": "高铁/飞机", "cost": 1000},
    "local": {"method": "地铁/公交", "dailyCost": 50}
  },
  "budgetBreakdown": {
    "accommodation": 1000,
    "dining": 1500,
    "transportation": 1200,
    "tickets": 800,
    "others": 500
  }
}

重要：你的回复必须是纯JSON格式，不要包含任何markdown标记或其他文字！`;

  try {
    const result = await callAI(prompt);
    
    // 保存当前计划数据(用于保存到云端)
    currentPlanData = result;
    currentPlanData.destination = destination;
    currentPlanData.days = days;
    currentPlanData.budget = budget;
    currentPlanData.travelers = travelers;
    
    // 显示结果
    displayResult(result);
    
    // 如果用户已登录,显示保存按钮
    if (typeof currentUser !== 'undefined' && currentUser) {
      const saveBtn = document.getElementById('save-plan-btn');
      if (saveBtn) {
        saveBtn.style.display = 'inline-block';
      }
    }
  } catch (error) {
    console.error('生成失败:', error);
    alert('生成失败：' + error.message + '\n\n请确保：\n1. 代理服务器已启动（运行 node server.js）\n2. API Key配置正确');
  } finally {
    document.getElementById('loading').style.display = 'none';
  }
}

// 调用AI接口
async function callAI(prompt) {
  try {
    console.log('发送请求到代理服务器...');
    
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,  // ⚠️ 修复：使用 prompt 而不是 message
        apiKey: window.CONFIG.DASHSCOPE_API_KEY
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('收到服务器响应:', data);

    // ⚠️ 修复：正确处理阿里云API的响应格式
    let responseText = '';
    
    // 阿里云API返回格式: data.output.choices[0].message.content
    if (data.output && data.output.choices && data.output.choices.length > 0) {
      responseText = data.output.choices[0].message.content;
      console.log('AI原始返回:', responseText);
    } else if (data.output && data.output.text) {
      // 旧版API格式
      responseText = data.output.text;
      console.log('AI原始返回:', responseText);
    } else {
      console.error('未知的响应格式:', data);
      throw new Error('API返回格式不正确');
    }

    // 检查响应是否为空
    if (!responseText || responseText.trim() === '') {
      throw new Error('AI返回内容为空');
    }

    // 多种方式尝试解析JSON
    let jsonData;

    // 方法1: 尝试从markdown代码块中提取
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      responseText = jsonMatch[1];
      console.log('从markdown代码块中提取JSON');
    }

    // 方法2: 移除可能的前缀和后缀文字
    responseText = responseText.trim();
    
    // 查找第一个{和最后一个}
    const firstBrace = responseText.indexOf('{');
    const lastBrace = responseText.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      responseText = responseText.substring(firstBrace, lastBrace + 1);
      console.log('提取JSON对象');
    }

    // 方法3: 尝试修复常见的JSON错误
    responseText = responseText
      .replace(/,(\s*[}\]])/g, '$1')  // 移除尾部逗号
      .replace(/'/g, '"');             // 单引号转双引号
      // 不再替换属性名，因为可能破坏正确的JSON

    try {
      jsonData = JSON.parse(responseText);
      console.log('✅ JSON解析成功');
    } catch (parseError) {
      console.error('JSON解析失败:', parseError);
      console.log('尝试解析的文本:', responseText);
      throw new Error('AI返回的数据格式有误，请重试');
    }

    return jsonData;
  } catch (error) {
    console.error('AI调用失败:', error);
    throw error;
  }
}

// 显示结果
function displayResult(data) {
  const container = document.getElementById('result-content');
  
  let html = `
    <div class="plan-summary">
      <h3>📍 ${data.title || data.destination + '旅行计划'}</h3>
      <p><strong>目的地：</strong>${data.destination}</p>
      <p><strong>天数：</strong>${data.days}天</p>
      <p><strong>预算：</strong>¥${data.budget}</p>
      <p><strong>人数：</strong>${data.travelers}人</p>
    </div>
  `;
  
  // 每日行程
  if (data.itinerary && data.itinerary.length > 0) {
    html += '<h3>📅 每日行程</h3>';
    data.itinerary.forEach(day => {
      html += `
        <div class="day-plan">
          <h4>第${day.day}天 ${day.date || ''}</h4>
          <ul>
      `;
      if (day.activities) {
        day.activities.forEach(activity => {
          html += `<li><strong>${activity.time}</strong> - ${activity.location}: ${activity.activity}`;
          if (activity.cost) {
            html += ` (约¥${activity.cost})`;
          }
          html += '</li>';
        });
      }
      html += '</ul></div>';
    });
  }
  
  // 住宿推荐
  if (data.accommodation && data.accommodation.length > 0) {
    html += '<h3>🏨 住宿推荐</h3><ul>';
    data.accommodation.forEach(hotel => {
      html += `
        <li>
          <strong>${hotel.name}</strong> (${hotel.type || '酒店'}) - 
          ¥${hotel.pricePerNight}/晚 × ${hotel.nights}晚 = ¥${hotel.pricePerNight * hotel.nights}
          <br>位置: ${hotel.location || '市中心'}
        </li>
      `;
    });
    html += '</ul>';
  }
  
  // 餐饮推荐
  if (data.dining && data.dining.length > 0) {
    html += '<h3>🍴 餐饮推荐</h3><ul>';
    data.dining.forEach(restaurant => {
      html += `
        <li>
          <strong>${restaurant.name}</strong> (${restaurant.cuisine}) - 
          人均¥${restaurant.avgCost}
      `;
      if (restaurant.recommendations && restaurant.recommendations.length > 0) {
        html += `<br>推荐: ${restaurant.recommendations.join('、')}`;
      }
      html += '</li>';
    });
    html += '</ul>';
  }
  
  // 交通方式
  if (data.transportation) {
    html += '<h3>🚄 交通方式</h3><ul>';
    if (data.transportation.intercity) {
      html += `<li><strong>城际交通:</strong> ${data.transportation.intercity.method} (约¥${data.transportation.intercity.cost})</li>`;
    }
    if (data.transportation.local) {
      html += `<li><strong>市内交通:</strong> ${data.transportation.local.method} (每天约¥${data.transportation.local.dailyCost})</li>`;
    }
    html += '</ul>';
  }
  
  // 预算明细
  if (data.budgetBreakdown) {
    html += '<h3>💰 预算明细</h3><ul>';
    const breakdown = data.budgetBreakdown;
    const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
    
    if (breakdown.accommodation) html += `<li>住宿: ¥${breakdown.accommodation}</li>`;
    if (breakdown.dining) html += `<li>餐饮: ¥${breakdown.dining}</li>`;
    if (breakdown.transportation) html += `<li>交通: ¥${breakdown.transportation}</li>`;
    if (breakdown.tickets) html += `<li>门票: ¥${breakdown.tickets}</li>`;
    if (breakdown.others) html += `<li>其他: ¥${breakdown.others}</li>`;
    html += `<li><strong>总计: ¥${total}</strong></li>`;
    html += '</ul>';
  }
  
  container.innerHTML = html;
  document.getElementById('result-container').style.display = 'block';
  
  // 在地图上显示路线
  if (typeof displayTravelRoute === 'function') {
    displayTravelRoute(data);
  }
  
  // 滚动到结果区域
  document.getElementById('result-container').scrollIntoView({ behavior: 'smooth' });
}

// ===========================
// 保存计划功能
// ===========================
async function saveCurrentPlan() {
  if (!currentPlanData) {
    alert('没有可保存的计划');
    return;
  }
  
  if (typeof currentUser === 'undefined' || !currentUser) {
    alert('请先登录');
    if (typeof openAuthModal === 'function') {
      openAuthModal();
    }
    return;
  }
  
  if (typeof saveTravelPlan !== 'function') {
    alert('Supabase未正确配置');
    return;
  }
  
  await saveTravelPlan(currentPlanData);
}

// 显示计划详情(从云端加载)
function displayPlanDetails(planData) {
  displayResult(planData);
}

// 点击模态框外部关闭
window.onclick = function(event) {
  const settingsModal = document.getElementById('settings-modal');
  const authModal = document.getElementById('auth-modal');
  const plansModal = document.getElementById('plans-modal');
  
  if (event.target === settingsModal) {
    closeSettings();
  }
  if (event.target === authModal && typeof closeAuthModal === 'function') {
    closeAuthModal();
  }
  if (event.target === plansModal && typeof closePlansModal === 'function') {
    closePlansModal();
  }
}

// ===========================
// 导出PDF功能
// ===========================
function exportPlan() {
  if (!currentPlanData) {
    alert('没有可导出的计划');
    return;
  }
  
  // 这里可以使用 jsPDF 或直接打印
  window.print();
}

// ===========================
// 动态加载百度地图API
// ===========================
function loadBaiduMapAPI(apiKey) {
  // 如果已经加载过,先移除旧的
  const existingScript = document.querySelector('script[src*="api.map.baidu.com"]');
  if (existingScript) {
    console.log('移除旧的百度地图API脚本');
    existingScript.remove();
  }
  
  // 清除BMap对象,强制重新加载
  if (window.BMap) {
    delete window.BMap;
    console.log('清除旧的BMap对象');
  }
  
  return new Promise((resolve, reject) => {
    console.log('开始加载百度地图API...');
    
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://api.map.baidu.com/api?v=3.0&ak=${apiKey}&callback=initBaiduMapCallback`;
    
    // 全局回调函数
    window.initBaiduMapCallback = function() {
      console.log('✅ 百度地图API加载成功');
      
      // 等待一小段时间确保API完全就绪
      setTimeout(() => {
        // 初始化地图
        if (typeof initMap === 'function') {
          initMap();
        }
        resolve();
      }, 100);
    };
    
    script.onerror = function() {
      console.error('❌ 百度地图API加载失败');
      reject(new Error('百度地图API加载失败'));
    };
    
    document.head.appendChild(script);
  });
}

console.log('✅ script.js 加载完成');