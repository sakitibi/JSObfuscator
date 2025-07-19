document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('signup-form');
    const gameSelectElem = document.getElementById('game-select');
    console.log("game-select element:", gameSelectElem);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        try {
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();
            const birthday = document.getElementById("birthday").value.trim();
            // current email の取得も含めて
            const email = await window.secureAPI.getCurrentEmail() || document.getElementById('email').value.trim();
            const selectedOption = gameSelectElem.value.trim(); // この変数名で統一

            console.log("[signup.js] 入力 email:", JSON.stringify(email), "長さ:", email.length);
            console.log("[signup.js] 選択されたオプション:", selectedOption);

            const stored = await window.secureAPI.get(email);
            const username_get = stored?.username || '';
            const password_get = stored?.password || '';
            const birthday_get = stored?.birthday || '';
            const option_get = (stored?.option ?? '0').toString();

            // 万が一のため selectedOption の存在チェック
            if (!selectedOption || typeof selectedOption === 'undefined') {
                throw new Error("選択したオプションがありません");
            }

            // 同一内容かどうかをチェック
            if (username !== username_get || password !== password_get || selectedOption !== option_get || birthday !== birthday_get) {
                console.log("[signup.js] アカウント未重複と判断。保存を開始");
                // この部分で selectedOption を渡す
                await window.secureAPI.save(email, password, username, birthday, selectedOption);
                await window.secureAPI.setCurrentEmail(email);
                console.log("[signup.js] 保存完了。リダイレクト開始");
                await window.electronAPI.loginredirects();
            } else {
                console.log("[signup.js] アカウントは既に存在しています（保存せず）");
                alert("すでに13ninアカウントは存在しています");
            }
        } catch (error) {
            console.error("[signup.js] アカウント情報取得エラー:", error);
            alert("アカウントの照合に失敗しました。もう一度お試しください。");
        }
    });
});