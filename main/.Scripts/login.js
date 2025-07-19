const form = document.getElementById('login-form');
let login = false;

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  // 入力データを取得
  try{
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const birthday = document.getElementById("birthday").value.trim();
    const email = await window.secureAPI.getCurrentEmail() || document.getElementById('email').value.trim();
    const select = document.getElementById('game-select').value;

    const stored = await window.secureAPI.get(email);
    const username_get = stored.username || '';
    const password_get = stored.password || '';
    const birthday_get = stored.birthday || '';
    const storedSelect = (stored.option ?? '0').toString(); // ← 明示的に文字列へ

    console.log('[login] 入力値:', { username, password, email, birthday, select });
    console.log('[login] 保存済み:', { username_get, password_get, birthday_get, storedSelect });

    if (password.trim() === password_get.trim() && username.trim() === username_get.trim() && select.trim() === storedSelect.trim() && birthday.trim() === birthday_get.trim()){
      login = true;
      localStorage.setItem('ultraLogined', login);
      window.location.href = 'index.html';
    } else if (password_get && username_get && storedSelect && birthday) {
      alert('情報が正しくありません');
    } else {
      throw new Error('まだ13ninアカウントを登録していません。\nWebサイトでログインしている方は登録画面で\n自分の13ninアカウントの情報を入力してください。');
    }
  } catch (error) {
    console.error("エラー", error);
  }
});