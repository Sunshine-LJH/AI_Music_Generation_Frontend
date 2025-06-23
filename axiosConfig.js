import axios from 'axios';
import Cookies from 'js-cookie'; 

// 设置 axios 的基础 URL，这样在每个请求中就不用重复写 'http://localhost:8000'
axios.defaults.baseURL = 'http://localhost:8000';

// 允许请求携带 cookie
axios.defaults.withCredentials = true;

// 设置请求拦截器，在每个请求发送前，自动添加 CSRF Token
axios.interceptors.request.use(function (config) {
    // 从 cookie 中获取 CSRF token
    const csrfToken = Cookies.get('csrftoken');
    if (csrfToken) {
        // 如果 token 存在，则添加到请求头中
        config.headers['X-CSRFToken'] = csrfToken;
    }
    return config;
}, function (error) {
    return Promise.reject(error);
});

export default axios;
