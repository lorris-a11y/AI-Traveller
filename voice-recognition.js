// ===========================
// 语音识别模块 - 科大讯飞 WebAPI
// ===========================

let isListening = false;
let recognition = null;
let xfyunRecognition = null;

// 语音识别配置
const voiceConfig = {
  useXfyun: false, // 是否使用科大讯飞（需要配置）
  useBrowser: true, // 是否使用浏览器原生API
};

// ===========================
// 初始化语音识别
// ===========================
function initVoiceRecognition() {
  console.log('初始化语音识别...');
  
  // 检查是否配置了科大讯飞
  const xfyunAppId = localStorage.getItem('xfyun_appid');
  const xfyunSecret = localStorage.getItem('xfyun_secret');
  const xfyunKey = localStorage.getItem('xfyun_key');
  
  if (xfyunAppId && xfyunSecret && xfyunKey) {
    console.log('✅ 检测到科大讯飞配置，将使用科大讯飞语音识别');
    voiceConfig.useXfyun = true;
    initXfyunRecognition(xfyunAppId, xfyunSecret, xfyunKey);
  } else {
    console.log('⚠️ 未配置科大讯飞，将使用浏览器原生语音识别');
  }
  
  // 初始化浏览器原生语音识别（作为备用）
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = true; // 显示中间结果
    recognition.maxAlternatives = 1;

    recognition.onstart = function() {
      console.log('浏览器语音识别已启动');
      startListening();
    };

    recognition.onresult = function(event) {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      // 显示中间结果
      if (interimTranscript) {
        document.getElementById('voice-result').textContent = `识别中: ${interimTranscript}`;
        document.getElementById('voice-result').style.color = '#999';
      }
      
      // 处理最终结果
      if (finalTranscript) {
        document.getElementById('voice-result').textContent = `识别结果: ${finalTranscript}`;
        document.getElementById('voice-result').style.color = '#333';
        parseVoiceInput(finalTranscript);
      }
    };

    recognition.onerror = function(event) {
      console.error('语音识别错误:', event.error);
      let errorMsg = '识别失败';
      
      switch(event.error) {
        case 'no-speech':
          errorMsg = '未检测到语音，请重试';
          break;
        case 'audio-capture':
          errorMsg = '无法访问麦克风';
          break;
        case 'not-allowed':
          errorMsg = '麦克风权限被拒绝';
          break;
        case 'network':
          errorMsg = '网络错误';
          break;
      }
      
      document.getElementById('voice-status').textContent = errorMsg;
      stopListening();
    };

    recognition.onend = function() {
      console.log('浏览器语音识别已结束');
      stopListening();
    };
    
    console.log('✅ 浏览器语音识别初始化成功');
  } else {
    console.log('❌ 浏览器不支持语音识别');
  }
}

// ===========================
// 科大讯飞语音识别初始化
// ===========================
function initXfyunRecognition(appId, secret, key) {
  // 注意：科大讯飞WebAPI需要WebSocket连接
  // 这里提供基础框架，实际使用需要完整的WebSocket实现
  console.log('初始化科大讯飞语音识别...');
  
  xfyunRecognition = {
    appId: appId,
    secret: secret,
    key: key,
    ws: null,
    
    // 开始识别
    start: function() {
      return new Promise((resolve, reject) => {
        try {
          // 生成WebSocket URL（需要加密签名）
          const wsUrl = this.generateWebSocketUrl();
          this.ws = new WebSocket(wsUrl);
          
          this.ws.onopen = () => {
            console.log('科大讯飞WebSocket连接成功');
            startListening();
            resolve();
          };
          
          this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          };
          
          this.ws.onerror = (error) => {
            console.error('科大讯飞WebSocket错误:', error);
            reject(error);
          };
          
          this.ws.onclose = () => {
            console.log('科大讯飞WebSocket连接关闭');
            stopListening();
          };
        } catch (error) {
          console.error('科大讯飞初始化失败:', error);
          reject(error);
        }
      });
    },
    
    // 生成WebSocket URL（需要实现签名算法）
    generateWebSocketUrl: function() {
      // 这里需要实现科大讯飞的鉴权算法
      // 参考：https://www.xfyun.cn/doc/asr/voicedictation/API.html
      const host = 'iat-api.xfyun.cn';
      const path = '/v2/iat';
      const date = new Date().toUTCString();
      
      // 简化版URL（实际需要完整的签名）
      return `wss://${host}${path}?appid=${this.appId}`;
    },
    
    // 处理识别结果
    handleMessage: function(data) {
      if (data.code !== 0) {
        console.error('科大讯飞识别错误:', data.message);
        return;
      }
      
      if (data.data && data.data.result) {
        const result = data.data.result;
        let text = '';
        
        // 解析识别结果
        if (result.ws) {
          result.ws.forEach(ws => {
            ws.cw.forEach(cw => {
              text += cw.w;
            });
          });
        }
        
        // 是否为最终结果
        if (data.data.status === 2) {
          document.getElementById('voice-result').textContent = `识别结果: ${text}`;
          document.getElementById('voice-result').style.color = '#333';
          parseVoiceInput(text);
        } else {
          document.getElementById('voice-result').textContent = `识别中: ${text}`;
          document.getElementById('voice-result').style.color = '#999';
        }
      }
    },
    
    // 停止识别
    stop: function() {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
    }
  };
}

// ===========================
// 语音输入控制
// ===========================
function toggleVoiceInput() {
  if (isListening) {
    stopVoiceRecognition();
  } else {
    startVoiceRecognition();
  }
}

async function startVoiceRecognition() {
  // 优先使用科大讯飞
  if (voiceConfig.useXfyun && xfyunRecognition) {
    try {
      await xfyunRecognition.start();
      return;
    } catch (error) {
      console.error('科大讯飞启动失败，切换到浏览器语音识别:', error);
    }
  }
  
  // 使用浏览器原生语音识别
  if (recognition) {
    try {
      recognition.start();
    } catch (error) {
      console.error('语音识别启动失败:', error);
      alert('语音识别启动失败，请检查麦克风权限');
    }
  } else {
    alert('您的浏览器不支持语音识别功能，请使用Chrome浏览器');
  }
}

function stopVoiceRecognition() {
  if (voiceConfig.useXfyun && xfyunRecognition) {
    xfyunRecognition.stop();
  }
  
  if (recognition) {
    recognition.stop();
  }
}

function startListening() {
  isListening = true;
  const btn = document.getElementById('voice-btn');
  btn.classList.add('listening');
  btn.innerHTML = '🎤 <span class="pulse">正在听...</span>';
  document.getElementById('voice-status').textContent = '请清晰地说出您的旅行需求...';
  document.getElementById('voice-result').textContent = '';
}

function stopListening() {
  isListening = false;
  const btn = document.getElementById('voice-btn');
  btn.classList.remove('listening');
  btn.innerHTML = '🎤 语音输入';
  document.getElementById('voice-status').textContent = '';
}

// ===========================
// 智能解析语音输入（增强版）
// ===========================
function parseVoiceInput(text) {
  console.log('解析语音输入:', text);
  
  // 清理文本
  text = text.replace(/，/g, ',').replace(/。/g, '');
  
  // 提取目的地（支持多种表达方式）
  const destinationPatterns = [
    /(?:去|到|想去|前往|旅游|游玩)[\s]*([\u4e00-\u9fa5A-Za-z]+(?:市|省|县|区|国|岛)?)/,
    /([\u4e00-\u9fa5A-Za-z]+(?:市|省|县|区|国|岛))/
  ];
  
  for (let pattern of destinationPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      document.getElementById('destination').value = match[1];
      console.log('提取目的地:', match[1]);
      
      // 更新地图
      if (typeof updateMapLocation === 'function') {
        updateMapLocation();
      }
      break;
    }
  }
  
  // 提取天数（支持多种表达方式）
  const daysPatterns = [
    /(\d+)\s*(?:天|日|nights?)/i,
    /(?:玩|游|住|待)\s*(\d+)\s*(?:天|日)/,
  ];
  
  for (let pattern of daysPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      document.getElementById('days').value = match[1];
      console.log('提取天数:', match[1]);
      break;
    }
  }
  
  // 提取预算（支持多种表达方式）
  const budgetPatterns = [
    /预算\s*(?:大约|约|大概)?\s*(\d+)\s*(?:元|块|rmb)?/i,
    /(\d+)\s*(?:元|块)\s*(?:预算|左右)/i,
    /(?:花费|费用|价格)\s*(?:大约|约|大概)?\s*(\d+)/i
  ];
  
  for (let pattern of budgetPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let budget = parseInt(match[1]);
      
      // 处理单位（如果说"一万"、"两万"等）
      if (text.includes('万')) {
        budget *= 10000;
      } else if (text.includes('千')) {
        budget *= 1000;
      }
      
      document.getElementById('budget').value = budget;
      console.log('提取预算:', budget);
      break;
    }
  }
  
  // 提取人数（支持多种表达方式）
  const travelersPatterns = [
    /(\d+)\s*(?:个人|人|位)/,
    /(?:我们|一共|共)\s*(\d+)\s*(?:个人|人|位)?/,
    /(?:两|二)\s*(?:个人|人|位)/,  // 特殊处理"两人"
  ];
  
  for (let pattern of travelersPatterns) {
    const match = text.match(pattern);
    if (match) {
      let travelers = match[1] ? parseInt(match[1]) : 2; // "两人"的情况
      document.getElementById('travelers').value = travelers;
      console.log('提取人数:', travelers);
      break;
    }
  }
  
  // 提取偏好（关键词匹配）
  const preferences = [];
  const preferenceKeywords = {
    '美食': ['美食', '吃', '餐厅', '小吃', '特色菜'],
    '动漫': ['动漫', '二次元', 'acg', '漫画'],
    '亲子': ['孩子', '小孩', '儿童', '亲子', '家庭', '宝宝'],
    '文化': ['文化', '历史', '古迹', '博物馆', '寺庙', '遗产'],
    '购物': ['购物', '买东西', '商场', '免税店'],
    '自然': ['自然', '风景', '山', '海', '湖', '公园', '户外'],
    '摄影': ['摄影', '拍照', '打卡', '照相'],
    '冒险': ['冒险', '刺激', '极限', '运动'],
    '休闲': ['休闲', '放松', '度假', '悠闲']
  };
  
  for (let [pref, keywords] of Object.entries(preferenceKeywords)) {
    for (let keyword of keywords) {
      if (text.includes(keyword)) {
        if (!preferences.includes(pref)) {
          preferences.push(pref);
          togglePreference(pref); // 激活标签
        }
        break;
      }
    }
  }
  
  if (preferences.length > 0) {
    const currentPrefs = document.getElementById('preferences').value;
    const newPrefs = preferences.join('、');
    document.getElementById('preferences').value = currentPrefs ? 
      currentPrefs + '、' + newPrefs : newPrefs;
    console.log('提取偏好:', preferences);
  }
  
  // 显示解析成功提示
  showVoiceParseSuccess();
}

// 显示解析成功提示
function showVoiceParseSuccess() {
  const statusEl = document.getElementById('voice-status');
  statusEl.textContent = '✅ 识别成功！已自动填充表单';
  statusEl.style.color = '#4CAF50';
  
  setTimeout(() => {
    statusEl.textContent = '';
    statusEl.style.color = '';
  }, 3000);
}

// ===========================
// 偏好标签切换
// ===========================
function togglePreference(pref) {
  const buttons = document.querySelectorAll('.tag-btn');
  buttons.forEach(btn => {
    if (btn.textContent.includes(pref)) {
      btn.classList.toggle('active');
    }
  });
  
  // 更新textarea
  updatePreferencesText();
}

function updatePreferencesText() {
  const activeButtons = document.querySelectorAll('.tag-btn.active');
  const preferences = Array.from(activeButtons).map(btn => {
    return btn.textContent.replace(/[^\u4e00-\u9fa5]/g, '');
  });
  
  const textarea = document.getElementById('preferences');
  const currentText = textarea.value;
  
  // 合并标签和自定义文本
  const customPrefs = currentText.split('、').filter(p => 
    !preferences.includes(p.trim()) && p.trim()
  );
  
  const allPrefs = [...preferences, ...customPrefs];
  textarea.value = allPrefs.join('、');
}

// ===========================
// 页面加载时初始化
// ===========================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVoiceRecognition);
} else {
  initVoiceRecognition();
}

console.log('✅ voice-recognition.js 已加载');