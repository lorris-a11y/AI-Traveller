// 使用 Express 来同时提供静态文件和API
const express = require('express');
const https = require('https');
const path = require('path');

const app = express();
const PORT = 3000;

// 1. 提供静态文件 (index.html, script.js, style.css 等)
app.use(express.static(path.join(__dirname)));

// 2. 解析 POST 请求的 JSON body
app.use(express.json());

// 3. 处理根路径，确保用户访问 http://localhost:3000 时能看到 index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 4. 你的 API 代理 (基本不变, 只是改成了 Express 的格式)
app.post('/api/chat', (req, res) => {
    try {
        const { apiKey, prompt } = req.body;

        const postData = JSON.stringify({
            model: 'qwen-plus',
            input: {
                messages: [
                    { role: 'system', content: '你是一个专业的旅行规划助手。' },
                    { role: 'user', content: prompt }
                ]
            },
            parameters: {
                result_format: 'message'
            }
        });

        const options = {
            hostname: 'dashscope.aliyuncs.com',
            port: 443,
            path: '/api/v1/services/aigc/text-generation/generation',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const apiReq = https.request(options, (apiRes) => {
            let responseData = '';
            apiRes.on('data', (chunk) => { responseData += chunk; });
            apiRes.on('end', () => {
                res.status(apiRes.statusCode).json(JSON.parse(responseData));
            });
        });

        apiReq.on('error', (error) => {
            console.error('API请求错误:', error);
            res.status(500).json({ error: error.message });
        });

        apiReq.write(postData);
        apiReq.end();

    } catch (error) {
        res.status(400).json({ error: '请求格式错误' });
    }
});

// 5. 启动服务器
app.listen(PORT, () => {
    console.log(`✅ AI Traveller 服务器运行在 http://localhost:${PORT}`);
    console.log('💡 现在访问 http://localhost:3000 即可使用！');
});