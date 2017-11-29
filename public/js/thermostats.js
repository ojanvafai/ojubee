window.addEventListener('online', () => { window.location.reload(); });
window.addEventListener('offline', () => {
  document.body.classList.add('offline');
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('../service-worker.js').then(
    () => {},
    () => {
      console.log('CLIENT: service worker registration failure.');
    }
  );
}

window.addEventListener('beforeinstallprompt', function(e) {
  e.userChoice.then(function(choiceResult) {
    if(choiceResult.outcome == 'dismissed')
      console.log('User cancelled home screen install');
    else
      console.log('User added to home screen');
  });
});
