async function getUser() {
  const { data: { user }, error } = await window.supabase.auth.getUser();
  if (error) {
    console.error("ユーザー取得エラー:", error.message);
    return null;
  }
  console.log("ログインユーザー:", user);
  return user;
}

const form = document.getElementById('login-form');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if(!!await getUser()){
    await window.supabase.auth.signOut();
  }
  // 入力データを取得
  try{
    const password = document.getElementById('password').value;
    const email = document.getElementById('email').value.trim();
    console.log('[login] 入力値:', { password, email });
    const { data, error } = await window.supabase.auth.signInWithPassword({
      email,
      password,
    });
    if(!data || error){
      console.error("error: ", error.message);
    } else {
      window.location.href = 'index.html';
    }
  } catch (error) {
    console.error("エラー", error);
  }
});