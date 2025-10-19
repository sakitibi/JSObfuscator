const ultraUniqueLoadingScreenEl = document.querySelector(".loading");
let ultraUniqueRandomSpeed = Math.floor(Math.random() * 101 / 5);
let ultraUniqueCooldown = Math.floor(Math.random() * 10 + 2);
let ultraUniqueImageContainer = document.getElementById("image-container");
let ultraUniqueProgress = 0;
let ultraUniqueProgressFill = document.getElementById('progress-fill'); 
let ultraUniqueProgressText = document.getElementById('progress-text');
let IsObfuscate = false;
let login;

// ログイン中ユーザーの情報を取得
async function getUser() {
  const { data: { user }, error } = await window.supabase.auth.getUser();
  if (error) {
    console.error("ユーザー取得エラー:", error.message);
    return null;
  }
  return user;
}

function startProgressBar() {
  setTimeout(async () => {
    try{
      if(ultraUniqueProgress >= 100){
        throw new Error("ロードが先に終わった為\nログイン状態を取得出来ません");
      }
      ultraLogined = Boolean(await getUser());
    } catch(e){
      console.error("ログイン状態を取得出来ません: ", e);
    }
  }, 1000);
  const ultraUniqueProgressInterval = setInterval(() => {
    if(IsObfuscate === true){
      setInterval(() => {
        ultraUniqueRandomSpeed = Math.floor(Math.random() * 2);
      }, 200 * count * count);
    } else {
      ultraUniqueRandomSpeed = Math.floor(Math.random() * 101 / 5);
    }
    
    if (ultraUniqueProgress <= 100) {
      ultraUniqueProgressText.innerHTML = `${ultraUniqueProgress}%`; 
    }

    if (ultraUniqueProgress >= 40 && ultraUniqueCooldown > 0) {
      ultraUniqueCooldown -= 1;
    } else if (ultraUniqueProgress >= 100) {
      ultraUniqueProgress = 100;
      ultraUniqueProgressText.innerHTML = '100%';
      clearInterval(ultraUniqueProgressInterval);
        const ultraLogined = localStorage.getItem("ultraLogined");
        if (!ultraLogined) {
          window.location.replace('.login.html');
        } else {
          ultraUniqueLoadingScreenEl.classList.add("loaded");
        }
    } else {
      ultraUniqueProgress += Math.floor(Math.random() * ultraUniqueRandomSpeed); // ランダムに進む
    }

    ultraUniqueProgressFill.style.width = ultraUniqueProgress + '%';
  }, 100);
}

// ✅ 初回確認
const alreadyConfirmed = localStorage.getItem("ultraConfirmed");
if (!alreadyConfirmed) {
  const confirmed = window.confirm("アプリケーション JSObfuscatorがアクセス許可を求めています。\nこのアプリケーションを開きますか?");
  if (confirmed) {
    localStorage.setItem("ultraConfirmed", "true");
    startProgressBar(); // 初回確認後に開始
  } else {
    alert("アプリケーションを開けないため\nアプリを起動出来ません");
    window.electronAPI.quitApp();
  }
} else {
  startProgressBar(); // すでに確認済みならそのまま開始
}