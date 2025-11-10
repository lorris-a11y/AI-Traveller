// // API配置文件
// // 注意：这个文件不要提交到Git！添加到.gitignore中

// const CONFIG = {
//     // 阿里云DashScope API Key（必需）
//     dashscopeKey: '',
    
//     // Supabase配置（必需）
//     supabaseUrl: '',
//     supabaseAnonKey: ''
// };

// // 从localStorage读取配置
// function loadConfig() {
//     const saved = localStorage.getItem('travelPlannerConfig');
//     if (saved) {
//         const savedConfig = JSON.parse(saved);
//         Object.assign(CONFIG, savedConfig);
//     }
// }

// // 保存配置到localStorage
// function saveConfig() {
//     localStorage.setItem('travelPlannerConfig', JSON.stringify(CONFIG));
// }

// // 页面加载时读取配置
// loadConfig();

// ===========================
// 配置文件
// ===========================

// 初始化全局配置对象
window.CONFIG = {
  DASHSCOPE_API_KEY: '',
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  BAIDU_MAP_KEY: ''
};

console.log('✅ config.js 已加载');