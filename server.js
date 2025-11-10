// 简单的代理服务器，解决CORS问题
const http = require('http');
const https = require('https');

const PORT = 3000;

const server = http.createServer((req, res) => {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/api/chat') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const requestData = JSON.parse(body);
                const apiKey = requestData.apiKey;
                const prompt = requestData.prompt;

                // 调用阿里云API
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

                    apiRes.on('data', (chunk) => {
                        responseData += chunk;
                    });

                    apiRes.on('end', () => {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(responseData);
                    });
                });

                apiReq.on('error', (error) => {
                    console.error('API请求错误:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                });

                apiReq.write(postData);
                apiReq.end();

            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '请求格式错误' }));
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`✅ 代理服务器运行在 http://localhost:${PORT}`);
    console.log('💡 请确保前端使用 http://localhost:${PORT}/api/chat 调用API');
});