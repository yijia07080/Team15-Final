import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import $ from "jquery";

const ProviderOauth2Bridge = () => {
    useEffect(() => {
        // 取得 google oauth2 code 並轉發給後端
        const broadcastChannel = new BroadcastChannel("oauth2_channel");
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const groupId = state ? JSON.parse(state).groupId : "no-group";
        $.ajax({
            url: "http://localhost:8000/provider-oauth2callback/",
            type: "POST",
            contentType: 'application/json',
            crossDomain: true,
            data: JSON.stringify({
                code: code,
                groupId: groupId
            }),
            xhrFields: { withCredentials: true },
            success(response) {
                broadcastChannel.postMessage({
                    type: "providerOauth2End",
                });
                console.log("OAuth2 callback success:", response);
            },
            error(xhr, status, error) {
                console.error("OAuth2 callback error:", error);
            },
            finally() {
                // 自動關閉 popup
                window.close();
            }
        });
    }, []);

    return <p>登入中，請稍候...</p>;
}

export default ProviderOauth2Bridge;
