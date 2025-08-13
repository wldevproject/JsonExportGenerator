document.addEventListener('DOMContentLoaded', () => {
    // 1. Ambil elemen yang dibutuhkan
    const themeToggleButton = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

    // Pastikan tombolnya ada sebelum melanjutkan
    if (themeToggleButton) {
        // 2. Tambahkan event listener untuk klik
        themeToggleButton.addEventListener('click', () => {
            // Toggle class 'light-theme' pada elemen <html>
            htmlElement.classList.toggle('light-theme');

            // 3. Periksa tema saat ini dan simpan ke localStorage
            const isLightTheme = htmlElement.classList.contains('light-theme');
            const currentTheme = isLightTheme ? 'light' : 'dark';
            localStorage.setItem('theme', currentTheme);
        });
    }
});