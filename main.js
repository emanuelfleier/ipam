// main.js

import { Views } from './views.js';
import { Utils } from './utils.js';

// Obtenemos una referencia al formulario de login
const loginForm = document.getElementById('login-form');

// Verificamos que el formulario de login exista antes de agregar el evento
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('password-input').value;
        const loginMessage = document.getElementById('login-message');

        try {
            await Utils.authenticateUser(password);
            await Utils.loadData();

            loginMessage.textContent = '';
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('dashboard-container').classList.remove('hidden');

            const availableYears = Object.keys(Utils.statsData).sort();
            Views.initializeYearButtons();

            const latestYear = availableYears[availableYears.length - 1];
            Views.initializeDashboardButtons(latestYear);
            Views.switchView('annual', latestYear);

        } catch (error) {
            loginMessage.textContent = error.message;
            loginMessage.classList.remove('hidden');
        }
    });
}
