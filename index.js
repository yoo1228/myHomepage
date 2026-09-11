function changeTheme(idx){
    document.documentElement.style.setProperty('--first', first[idx]);
    document.documentElement.style.setProperty('--second', second[idx]);
    document.documentElement.style.setProperty('--third', third[idx]);
    document.documentElement.style.setProperty('--fourth', fourth[idx]);
    document.documentElement.style.setProperty('--h', h[idx]);
    document.documentElement.style.setProperty('--text', text[idx]);
}

/*https://colorhunt.co/palette/7c93c355679c1e2a5ee1d7b7*/
/*https://colorhunt.co/palette/fff5f5f7d6d0e2b4bd4a4a4a*/
/*https://colorhunt.co/palette/e8f5e9a5d6a766bb6a1b5e20*/
const first = ['#7C93C3','#FFF5F5','#E8F5E9']
const second = ['#55679C','#F7D6D0','#A5D6A7']
const third = ['#1E2A5E','#E2B4BD','#66BB6A']
const fourth = ['#E1D7B7', '#4A4A4A', '#1B5E20']
const h = ['white', 'white', 'white']
const text = ['white', 'black', 'black']


let themeIdx = 0;
const button = document.getElementById('change-theme');

button.addEventListener('click', () => {
  themeIdx = (themeIdx + 1) % first.length;
  changeTheme(themeIdx)
});