// ===========================
// Supabase认证和数据管理
// ===========================

// Supabase客户端实例
let supabase = null;
let currentUser = null;

// 初始化Supabase
function initSupabase() {
  const supabaseUrl = window.CONFIG?.SUPABASE_URL || localStorage.getItem('supabase_url');
  const supabaseKey = window.CONFIG?.SUPABASE_ANON_KEY || localStorage.getItem('supabase_anon_key');
  
  console.log('正在初始化Supabase...');
  console.log('URL存在:', !!supabaseUrl);
  console.log('Key存在:', !!supabaseKey);
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('⚠️ Supabase未配置，云端功能将不可用');
    console.log('请在设置中配置Supabase URL和Anon Key');
    return false;
  }
  
  try {
    // 检查supabase库是否加载
    if (!window.supabase) {
      console.error('❌ Supabase SDK未加载');
      alert('Supabase SDK未加载，请刷新页面重试');
      return false;
    }
    
    supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase初始化成功');
    
    // 更新CONFIG对象
    if (window.CONFIG) {
      window.CONFIG.SUPABASE_URL = supabaseUrl;
      window.CONFIG.SUPABASE_ANON_KEY = supabaseKey;
    }
    
    checkAuthStatus();
    return true;
  } catch (error) {
    console.error('❌ Supabase初始化失败:', error);
    alert('Supabase初始化失败: ' + error.message);
    return false;
  }
}

// 检查登录状态
async function checkAuthStatus() {
  if (!supabase) {
    console.log('Supabase未初始化，跳过登录状态检查');
    return;
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('检查登录状态出错:', error);
      return;
    }
    
    if (user) {
      currentUser = user;
      console.log('✅ 用户已登录:', user.email);
      updateUIForLoggedInUser(user);
      loadUserPlans();
    } else {
      currentUser = null;
      console.log('用户未登录');
      updateUIForLoggedOutUser();
    }
  } catch (error) {
    console.error('检查登录状态失败:', error);
  }
}

// 用户注册
async function signUp() {
  console.log('开始注册...');
  
  // 检查Supabase是否初始化
  if (!supabase) {
    showMessage('请先在设置中配置Supabase', 'error');
    console.error('Supabase未初始化');
    return;
  }
  
  const email = document.getElementById('auth-email')?.value?.trim();
  const password = document.getElementById('auth-password')?.value;
  
  console.log('邮箱:', email);
  console.log('密码长度:', password?.length);
  
  if (!email || !password) {
    showMessage('请输入邮箱和密码', 'error');
    return;
  }
  
  if (password.length < 6) {
    showMessage('密码至少需要6个字符', 'error');
    return;
  }
  
  try {
    showMessage('正在注册...', 'info');
    console.log('调用Supabase注册API...');
    
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });
    
    console.log('注册响应:', { data, error });
    
    if (error) {
      console.error('注册错误:', error);
      throw error;
    }
    
    showMessage('注册成功！请检查邮箱验证邮件', 'success');
    console.log('✅ 注册成功');
    
    // 如果不需要邮箱验证则自动登录
    if (data.user && data.session) {
      currentUser = data.user;
      updateUIForLoggedInUser(data.user);
      closeAuthModal();
    }
  } catch (error) {
    console.error('注册失败:', error);
    showMessage('注册失败: ' + error.message, 'error');
  }
}

// 用户登录
async function signIn() {
  console.log('开始登录...');
  
  // 检查Supabase是否初始化
  if (!supabase) {
    showMessage('请先在设置中配置Supabase', 'error');
    console.error('Supabase未初始化');
    return;
  }
  
  const email = document.getElementById('auth-email')?.value?.trim();
  const password = document.getElementById('auth-password')?.value;
  
  if (!email || !password) {
    showMessage('请输入邮箱和密码', 'error');
    return;
  }
  
  try {
    showMessage('正在登录...', 'info');
    console.log('调用Supabase登录API...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
    
    console.log('登录响应:', { data, error });
    
    if (error) {
      console.error('登录错误:', error);
      throw error;
    }
    
    currentUser = data.user;
    showMessage('登录成功!', 'success');
    console.log('✅ 登录成功:', data.user.email);
    updateUIForLoggedInUser(data.user);
    closeAuthModal();
    loadUserPlans();
  } catch (error) {
    console.error('登录失败:', error);
    showMessage('登录失败: ' + error.message, 'error');
  }
}

// 用户登出
async function signOut() {
  if (!supabase) {
    showMessage('Supabase未初始化', 'error');
    return;
  }
  
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    currentUser = null;
    showMessage('已退出登录', 'success');
    console.log('✅ 已退出登录');
    updateUIForLoggedOutUser();
  } catch (error) {
    console.error('退出失败:', error);
    showMessage('退出失败: ' + error.message, 'error');
  }
}

// 保存旅行计划
async function saveTravelPlan(planData) {
  if (!supabase) {
    showMessage('请先在设置中配置Supabase', 'error');
    return false;
  }
  
  if (!currentUser) {
    showMessage('请先登录后再保存计划', 'error');
    openAuthModal();
    return false;
  }
  
  try {
    showMessage('正在保存计划...', 'info');
    console.log('保存计划数据:', planData);
    
    // 准备保存的数据
    const planToSave = {
      user_id: currentUser.id,
      title: planData.title || `${planData.destination}旅行计划`,
      destination: planData.destination,
      days: planData.days,
      budget: planData.budget,
      travelers: planData.travelers,
      plan_data: planData // 完整的计划数据存为JSONB
    };
    
    console.log('准备插入数据库:', planToSave);
    
    // 插入到travel_plans表
    const { data, error } = await supabase
      .from('travel_plans')
      .insert([planToSave])
      .select()
      .single();
    
    if (error) {
      console.error('数据库错误:', error);
      throw error;
    }
    
    console.log('✅ 保存成功:', data);
    showMessage('计划已保存到云端!', 'success');
    loadUserPlans(); // 刷新计划列表
    return data;
  } catch (error) {
    console.error('保存失败:', error);
    showMessage('保存失败: ' + error.message, 'error');
    return false;
  }
}

// 加载用户的旅行计划列表
async function loadUserPlans() {
  if (!supabase || !currentUser) return;
  
  try {
    console.log('加载用户计划...');
    
    const { data, error } = await supabase
      .from('travel_plans')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('加载计划错误:', error);
      throw error;
    }
    
    console.log('✅ 加载到', data?.length || 0, '个计划');
    displayUserPlans(data);
  } catch (error) {
    console.error('加载计划失败:', error);
    showMessage('加载计划失败: ' + error.message, 'error');
  }
}

// 显示用户的计划列表
function displayUserPlans(plans) {
  const container = document.getElementById('user-plans-list');
  if (!container) return;
  
  if (!plans || plans.length === 0) {
    container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">暂无保存的旅行计划</p>';
    return;
  }
  
  container.innerHTML = plans.map(plan => `
    <div class="plan-item" style="border: 1px solid #e0e0e0; padding: 15px; margin-bottom: 10px; border-radius: 8px; cursor: pointer;">
      <h4 style="margin: 0 0 8px 0;">${plan.title}</h4>
      <p style="margin: 0; color: #666; font-size: 14px;">
        目的地: ${plan.destination} | 天数: ${plan.days}天 | 预算: ¥${plan.budget}
      </p>
      <p style="margin: 5px 0 0 0; color: #999; font-size: 12px;">
        创建于: ${new Date(plan.created_at).toLocaleDateString()}
      </p>
      <div style="margin-top: 10px;">
        <button onclick="loadPlan('${plan.id}')" style="margin-right: 10px;">查看详情</button>
        <button onclick="deletePlan('${plan.id}')" style="background-color: #ff4444;">删除</button>
      </div>
    </div>
  `).join('');
}

// 加载单个计划的详细信息
async function loadPlan(planId) {
  if (!supabase) return;
  
  try {
    const { data, error } = await supabase
      .from('travel_plans')
      .select('*')
      .eq('id', planId)
      .single();
    
    if (error) throw error;
    
    // 显示计划详情
    if (typeof displayPlanDetails === 'function') {
      displayPlanDetails(data.plan_data);
    }
    closePlansModal();
  } catch (error) {
    console.error('加载计划详情失败:', error);
    showMessage('加载失败: ' + error.message, 'error');
  }
}

// 删除计划
async function deletePlan(planId) {
  if (!supabase) return;
  
  if (!confirm('确定要删除这个旅行计划吗？此操作无法撤销。')) {
    return;
  }
  
  try {
    const { error } = await supabase
      .from('travel_plans')
      .delete()
      .eq('id', planId);
    
    if (error) throw error;
    
    showMessage('计划已删除', 'success');
    loadUserPlans(); // 刷新列表
  } catch (error) {
    console.error('删除失败:', error);
    showMessage('删除失败: ' + error.message, 'error');
  }
}

// 添加费用记录
async function addExpense(travelPlanId, expenseData) {
  if (!supabase || !currentUser) {
    showMessage('请先登录', 'error');
    return false;
  }
  
  try {
    const { data, error } = await supabase
      .from('expenses')
      .insert([{
        travel_plan_id: travelPlanId,
        category: expenseData.category,
        amount: expenseData.amount,
        description: expenseData.description,
        expense_date: expenseData.date
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    showMessage('费用记录已添加', 'success');
    return data;
  } catch (error) {
    console.error('添加费用失败:', error);
    showMessage('添加失败: ' + error.message, 'error');
    return false;
  }
}

// 获取某个计划的所有费用
async function getExpenses(travelPlanId) {
  if (!supabase) return [];
  
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('travel_plan_id', travelPlanId)
      .order('expense_date', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('获取费用记录失败:', error);
    return [];
  }
}

// ===========================
// UI更新函数
// ===========================

function updateUIForLoggedInUser(user) {
  console.log('更新UI为已登录状态');
  
  // 更新用户按钮
  const authBtn = document.getElementById('auth-btn');
  if (authBtn) {
    authBtn.textContent = '👤 ' + (user.email || '用户');
    authBtn.onclick = showUserMenu;
  }
  
  // 显示保存按钮
  const saveBtn = document.getElementById('save-plan-btn');
  if (saveBtn) {
    saveBtn.style.display = 'inline-block';
  }
}

function updateUIForLoggedOutUser() {
  console.log('更新UI为未登录状态');
  
  // 更新用户按钮
  const authBtn = document.getElementById('auth-btn');
  if (authBtn) {
    authBtn.textContent = '🔐 登录';
    authBtn.onclick = openAuthModal;
  }
  
  // 隐藏保存按钮
  const saveBtn = document.getElementById('save-plan-btn');
  if (saveBtn) {
    saveBtn.style.display = 'none';
  }
}

function showUserMenu() {
  const menu = `
    <div style="position: fixed; top: 60px; right: 20px; background: white; border: 1px solid #ddd; border-radius: 8px; padding: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); z-index: 1001;">
      <div style="margin-bottom: 10px;">
        <strong>${currentUser?.email || '用户'}</strong>
      </div>
      <button onclick="openPlansModal()" style="width: 100%; margin-bottom: 5px;">我的计划</button>
      <button onclick="signOut()" style="width: 100%; background-color: #ff4444;">退出登录</button>
    </div>
  `;
  
  // 移除现有菜单
  const existing = document.getElementById('user-menu');
  if (existing) existing.remove();
  
  // 添加新菜单
  const div = document.createElement('div');
  div.id = 'user-menu';
  div.innerHTML = menu;
  document.body.appendChild(div);
  
  // 点击其他地方关闭菜单
  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if (!e.target.closest('#user-menu') && !e.target.closest('#auth-btn')) {
        const menu = document.getElementById('user-menu');
        if (menu) menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 100);
}

// ===========================
// 模态框控制
// ===========================

function openAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.style.display = 'block';
  }
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function openPlansModal() {
  const modal = document.getElementById('plans-modal');
  if (modal) {
    modal.style.display = 'block';
    loadUserPlans();
  }
  
  // 关闭用户菜单
  const menu = document.getElementById('user-menu');
  if (menu) menu.remove();
}

function closePlansModal() {
  const modal = document.getElementById('plans-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// ===========================
// 工具函数
// ===========================

function showMessage(message, type = 'info') {
  console.log(`[${type}] ${message}`);
  
  // 移除现有消息
  const existing = document.querySelector('.toast-message');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'toast-message';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    animation: slideIn 0.3s ease;
    max-width: 300px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  
  // 根据类型设置背景色
  const colors = {
    success: '#4CAF50',
    error: '#f44336',
    info: '#2196F3',
    warning: '#ff9800'
  };
  toast.style.backgroundColor = colors[type] || colors.info;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// 添加动画样式
if (!document.getElementById('toast-animations')) {
  const style = document.createElement('style');
  style.id = 'toast-animations';
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

// 页面加载完成后延迟初始化(确保Supabase SDK已加载)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initSupabase, 500);
  });
} else {
  setTimeout(initSupabase, 500);
}

console.log('✅ auth.js 已加载');