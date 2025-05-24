import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const ProviderOauth2Bridge = () => {
    // 傳回主頁
    if (window.opener) {
        window.opener.postMessage(
            {type: 'providerOauth2End'}, 
            "http://localhost:5174/" // 確保這裡的 URL 與你的主頁 URL 相符
        );
        window.close();
    }

    return <p>登入中，請稍候...</p>;
}

export default ProviderOauth2Bridge;
