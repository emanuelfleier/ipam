// Variable global para almacenar los datos cargados desde data.json
let statsData = {};

// Constante para la contraseña. En una aplicación real, no estaría aquí.
const CORRECT_PASSWORD = 'ipam3125';

// Mapa de nombres de meses en inglés a español
const monthNamesMap = {
    "january": "Enero",
    "february": "Febrero",
    "march": "Marzo",
    "april": "Abril",
    "may": "Mayo",
    "june": "Junio",
    "july": "Julio",
    "august": "Agosto",
    "september": "Septiembre",
    "october": "Octubre",
    "november": "Noviembre",
    "december": "Diciembre"
};

// Simula la llamada a un servidor para autenticar al usuario
function authenticateUser(password) {
    return new Promise((resolve, reject) => {
        // Simulamos una latencia de red de 3000ms (3 segundos)
        setTimeout(() => {
            if (password === CORRECT_PASSWORD) {
                resolve({ success: true });
            } else {
                reject({ success: false, message: 'Contraseña incorrecta.' });
            }
        }, 3000);
    });
}

// Se ejecuta una vez que todo el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {

    // Referencias a los elementos del DOM
    const passwordForm = document.getElementById('password-form');
    const passwordInput = document.getElementById('password-input');
    const errorMessage = document.getElementById('error-message');
    const passwordModal = document.getElementById('password-modal');
    const mainContent = document.getElementById('main-content');
    const clearFilterBtn = document.getElementById('clear-filter-btn');

    // Lógica del formulario de contraseña (ahora asíncrona)
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const enteredPassword = passwordInput.value;
        const loginButton = passwordForm.querySelector('button[type="submit"]');

        loginButton.textContent = 'Verificando...';
        loginButton.disabled = true;

        try {
            const authResponse = await authenticateUser(enteredPassword);

            if (authResponse.success) {
                passwordModal.classList.add('hidden');
                mainContent.classList.remove('hidden');
                initializeDashboard();
            }

        } catch (error) {
            errorMessage.classList.remove('hidden');
            passwordInput.value = '';
            passwordInput.focus();
            console.error('Error de autenticación:', error.message);
        } finally {
            loginButton.textContent = 'Ingresar';
            loginButton.disabled = false;
        }
    });

    // Función para cargar los datos del archivo JSON
    function loadDataAndInitializeDashboard() {
        fetch('data.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('No se pudo cargar el archivo de datos');
                }
                return response.json();
            })
            .then(data => {
                statsData = data;
                // Si ya estamos autenticados, inicializamos el dashboard
                if (mainContent.classList.contains('hidden')) {
                     initializeDashboard();
                }
            })
            .catch(error => {
                console.error('Hubo un problema con la operación de fetch:', error);
                document.getElementById('main-content').innerHTML = '<p class="text-red-500 text-center text-lg">Hubo un error al cargar los datos. Por favor, intente de nuevo más tarde.</p>';
            });
    }

    loadDataAndInitializeDashboard();

    // --- LÓGICA DEL DASHBOARD ---

    let charts = {};
    const colorPalette = ['#0f766e', '#0e7490', '#1d4ed8', '#16a34a', '#8b5cf6', '#ec4899', '#f97316', '#a16207', '#6d28d9', '#be185d', '#312e81', '#1e40af'];
    const lightColorPalette = ['#a7f3d0', '#67e8f9', '#93c5fd', '#a7f3d0', '#c4b5fd', '#fbcfe8', '#fed7aa', '#fde68a', '#d8b4fe', '#f9a8d4', '#94a3b8', '#bfdbfe'];
    
    // Nuevas paletas de colores más contrastantes para los gráficos de resumen
    const contrastingLinePalette = [
        '#E63946', // Rojo brillante
        '#457B9D', // Azul acero
        '#1D3557', // Azul marino
        '#A8DADC', // Cian claro
        '#F4A261', // Naranja
        '#2A9D8F',  // Verde azulado
        '#9D4EDD', // Púrpura
        '#FFC300' // Amarillo
    ];
    
    const extendedContrastingPalette = [
        '#FF5733', '#C70039', '#900C3F', '#581845', '#1D3557', '#0074D9', '#3D9970', '#2ECC40', '#FFDC00', '#FF851B',
        '#F012BE', '#B10DC9', '#85144B', '#FF4136', '#FF69B4', '#6A0572', '#2B1B17', '#E74C3C', '#2C3E50', '#7F8C8D'
    ];

    // Variables de estado para los filtros (Ahora solo para el resumen)
    let selectedAdvancedServices = []; 
    let selectedAdvancedObrasSociales = [];
    let allServices = [];
    let allObrasSociales = [];
    let selectedEvolutionFilters = ['practicas', 'pacientes'];
    let selectedServiceEvolutionFilters = ['Eco Doppler', 'Ecografía', 'Radiología', 'Resonancia', 'Tomografía']; // Nuevo estado para la gráfica de evolución por servicio


    function showFilterMessage(filterType, filterValue) {
        const filterBar = document.getElementById('filter-bar');
        const filterText = document.getElementById('filter-text');
        filterText.textContent = `Mostrando resultados para ${filterType}: "${filterValue}"`;
        filterBar.classList.remove('hidden');
    }

    function clearFilterMessage() {
        document.getElementById('filter-bar').classList.add('hidden');
    }

    // Función auxiliar para determinar si un color es claro u oscuro
    function isLight(color) {
        var r, g, b;
        if (color.match(/^#[0-9a-f]{6}$/i)) {
            r = parseInt(color.substring(1, 3), 16);
            g = parseInt(color.substring(3, 5), 16);
            b = parseInt(color.substring(5, 7), 16);
        } else if (color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/)) {
            var parts = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
            r = parseInt(parts[1]);
            g = parseInt(parts[2]);
            b = parseInt(parts[3]);
        } else {
            return false;
        }

        const luma = ((0.299 * r) + (0.587 * g) + (0.114 * b)) / 255;
        return luma > 0.6;
    }

    // Nueva función para obtener opciones de datalabels para max y min, y para todos los valores > 0
    function getDatalabelsOptions(type) {
        return {
            color: '#444444',
            backgroundColor: '#f0f0f0',
            borderColor: (context) => context.dataset.borderColor, // Usar el color de la curva para el borde
            borderWidth: 2, // Grosor del borde
            borderRadius: 4,
            font: {
                weight: 'bold',
                size: 14 // Aumenta el tamaño del texto para mejor legibilidad
            },
            padding: 6, // Aumenta el padding para que el recuadro sea más visible
            display: (context) => {
                const value = context.dataset.data[context.dataIndex];
                return value > 0;
            },
            formatter: (value, context) => {
                return value;
            }
        };
    }

    function renderChart(canvasId, type, labels, datasets, options = {}) {
        if (charts[canvasId]) {
            charts[canvasId].destroy();
        }
        const ctx = document.getElementById(canvasId).getContext('2d');

        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#475569'
                    },
                    onClick: (e, legendItem, legend) => {
                        return;
                    }
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 12
                    },
                    padding: 10,
                    cornerRadius: 4,
                    mode: 'index',
                    intersect: false,
                },
                datalabels: getDatalabelsOptions(type)
            },
            scales: (type === 'bar' || type === 'line') ? {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#e2e8f0'
                    },
                    ticks: {
                        color: '#64748b'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#64748b'
                    }
                }
            } : {},
        };

        if (type === 'doughnut') {
            defaultOptions.plugins.legend.position = 'right';
        } else if (datasets.length <= 1 && type !== 'line') {
            defaultOptions.plugins.legend.display = false;
        }

        if (options.indexAxis === 'y') {
            defaultOptions.scales = {
                x: {
                    beginAtZero: true,
                    grid: {
                        color: '#e2e8f0'
                    },
                    ticks: {
                        color: '#64748b'
                    }
                },
                y: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#64748b'
                    }
                }
            };
        }
        charts[canvasId] = new Chart(ctx, {
            type,
            data: {
                labels,
                datasets
            },
            options: { ...defaultOptions,
                ...options
            }
        });
    }

    function getChangeIndicator(current, previous) {
        if (previous === null || previous === 0) return '';
        const change = ((current - previous) / previous) * 100;
        const color = change >= 0 ? 'text-green-600' : 'text-red-600';
        const icon = change >= 0 ?
            `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clip-rule="evenodd" /></svg>` :
            `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414 0l-3 3a1 1 0 101.414 1.414L9 10.586V7a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 000-1.414z" clip-rule="evenodd" /></svg>`;
        return `<span class="flex items-center text-xs font-semibold ${color} ml-2">${change.toFixed(1)}%</span>`;
    }

    function createFilterButtons(containerId, data, selectedData, clickHandler, colors = null) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        data.forEach((item, index) => {
            const button = document.createElement('button');
            const isActive = selectedData.includes(item);
            button.textContent = item;
            
            const itemColor = colors ? colors[index % colors.length] : '#1D4ED8';
            const activeBgColor = itemColor;
            const activeTextColor = 'white';
            const defaultBgColor = 'white';
            const defaultTextColor = '#475569';
            
            button.style.border = `1px solid ${itemColor}`;
            button.style.backgroundColor = isActive ? activeBgColor : defaultBgColor;
            button.style.color = isActive ? activeTextColor : itemColor;

            button.className = `px-3 py-1 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50`;
            button.addEventListener('click', () => clickHandler(item));
            container.appendChild(button);
        });
    }

    function toggleFilter(item, filterArray) {
        const index = filterArray.indexOf(item);
        if (index > -1) {
            // Asegura que no se puedan deseleccionar todos los filtros
            if (filterArray.length > 1) {
                filterArray.splice(index, 1);
            }
        } else {
            filterArray.push(item);
        }
    }

    function showMonthlyView(month) {
        const data = statsData[month];
        if (!data) return;
        const months = Object.keys(statsData);
        const currentMonthIndex = months.indexOf(month);
        const previousMonthData = currentMonthIndex > 0 ? statsData[months[currentMonthIndex - 1]] : null;

        const practicasIndicator = getChangeIndicator(data.kpis.practicas, previousMonthData ? previousMonthData.kpis.practicas : null);
        const pacientesIndicator = getChangeIndicator(data.kpis.pacientes, previousMonthData ? previousMonthData.kpis.pacientes : null);
        
        const maxServiceIndex = data.tipoServicio.data.indexOf(Math.max(...data.tipoServicio.data));
        const servicioPrincipal = data.tipoServicio.labels[maxServiceIndex];
        const maxDayIndex = data.diasSemana.data.indexOf(Math.max(...data.diasSemana.data));
        const diaPico = data.diasSemana.labels[maxDayIndex];
        const maxOsIndex = data.obrasSociales.data.indexOf(Math.max(...data.obrasSociales.data));
        const osPrincipal = data.obrasSociales.labels[maxOsIndex];

        const kpiContainer = document.getElementById('kpi-container');
        kpiContainer.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8';
        kpiContainer.innerHTML = `
            <div class="kpi-card">
                <div class="kpi-icon bg-teal-100 text-teal-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg></div>
                <div>
                    <p class="text-sm text-gray-500">Total Prácticas</p>
                    <div class="flex items-baseline">
                        <p class="text-2xl font-bold text-gray-800">${data.kpis.practicas}</p>
                        ${practicasIndicator}
                    </div>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon bg-cyan-100 text-cyan-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg></div>
                <div>
                    <p class="text-sm text-gray-500">Pacientes Únicos</p>
                    <div class="flex items-baseline">
                        <p class="text-2xl font-bold text-gray-800">${data.kpis.pacientes}</p>
                        ${pacientesIndicator}
                    </div>
                </div>
            </div>
            <div class="kpi-card"><div class="kpi-icon bg-teal-100 text-teal-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg></div><div><p class="text-sm text-gray-500">Promedio x Paciente</p><p class="text-2xl font-bold text-gray-800">${data.kpis.promedio}</p></div></div>
            <div class="kpi-card"><div class="kpi-icon bg-cyan-100 text-cyan-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547a2 2 0 00-.547 1.806l.477 2.387a6 6 0 00.517 3.86l.158.318a6 6 0 003.86.517l2.387.477a2 2 0 001.806-.547a2 2 0 00.547-1.806l-.477-2.387a6 6 0 00-.517-3.86l-.158-.318a6 6 0 01-.517-3.86l.477-2.387a2 2 0 00.547-1.806z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8V4m0 4h4m-4 0L8 8" /></svg></div><div><p class="text-sm text-gray-500">Servicio Principal</p><p class="text-2xl font-bold text-gray-800">${servicioPrincipal}</p></div></div>
            <div class="kpi-card"><div class="kpi-icon bg-teal-100 text-teal-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg></div><div class="min-w-0"><p class="text-sm text-gray-500">Obra Social Principal</p><p class="text-xl font-bold text-gray-800 truncate">${osPrincipal}</p></div></div>
            <div class="kpi-card"><div class="kpi-icon bg-cyan-100 text-cyan-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div><div><p class="text-sm text-gray-500">Día de Mayor Actividad</p><p class="text-2xl font-bold text-gray-800">${diaPico}</p></div></div>
        `;

        const chartsGrid = document.getElementById('charts-grid');
        chartsGrid.innerHTML = `
            <div class="bg-white p-6 rounded-xl shadow-sm">
                <h2 class="text-xl font-semibold text-gray-700">Origen del Servicio</h2>
                <p class="text-sm text-gray-500 mb-4">De qué área provienen las solicitudes de estudios.</p>
                <div class="chart-container"><canvas id="origenChart"></canvas></div>
            </div>
            <div class="bg-white p-6 rounded-xl shadow-sm">
                <h2 class="text-xl font-semibold text-gray-700">Tipo de Servicio</h2>
                <p class="text-sm text-gray-500 mb-4">Distribución de los tipos de estudios médicos realizados.</p>
                <div class="chart-container"><canvas id="tipoServicioChart"></canvas></div>
            </div>
            <div class="bg-white p-6 rounded-xl shadow-sm lg:col-span-2">
                <h2 class="text-xl font-semibold text-gray-700">Profesionales con Mayor Volumen</h2>
                <p class="text-sm text-gray-500 mb-4">Clasificación de profesionales según la cantidad de estudios.</p>
                <div class="chart-container" style="height: 400px;"><canvas id="profesionalesChart"></canvas></div>
            </div>
            <div class="bg-white p-6 rounded-xl shadow-sm">
                <h2 class="text-xl font-semibold text-gray-700">Obras Sociales con Mayor Volumen</h2>
                <p class="text-sm text-gray-500 mb-4">Obras sociales que generaron el mayor volumen de estudios.</p>
                <div class="chart-container"><canvas id="obrasSocialesChart"></canvas></div>
            </div>
            <div class="bg-white p-6 rounded-xl shadow-sm">
                <h2 class="text-xl font-semibold text-gray-700">Prestaciones por Día de la Semana</h2>
                <p class="text-sm text-gray-500 mb-4">Distribución de la carga de trabajo a lo largo de la semana.</p>
                <div class="chart-container"><canvas id="diasSemanaChart"></canvas></div>
            </div>
            <div class="bg-white p-6 rounded-xl shadow-sm lg:col-span-2">
                <h2 class="text-xl font-semibold text-gray-700">Frecuencia de Estudios por Paciente</h2>
                <p class="text-sm text-gray-500 mb-4">Cuántos pacientes se realizaron 1, 2, 3 o más estudios.</p>
                <ul id="top-pacientes-list" class="space-y-3 text-gray-600 mt-4"></ul>
            </div>
            <div class="bg-white p-6 rounded-xl shadow-sm lg:col-span-2">
                <h2 class="text-xl font-semibold text-gray-700">Top 10 Pacientes con Más Estudios</h2>
                <p class="text-sm text-gray-500 mb-4">Pacientes que han requerido la mayor cantidad de estudios.</p>
                <ul id="top-pacientes-list" class="space-y-3 text-gray-600 mt-4"></ul>
            </div>
        `;

        // Renderizado de gráficos mensuales sin filtros
        renderChart('origenChart', 'doughnut', data.origen.labels, [{
            label: 'Origen',
            data: data.origen.data,
            backgroundColor: colorPalette,
        }]);
        renderChart('tipoServicioChart', 'bar', data.tipoServicio.labels, [{
            label: 'Tipo de Servicio',
            data: data.tipoServicio.data,
            backgroundColor: colorPalette[0],
        }]);
        renderChart('profesionalesChart', 'bar', data.profesionales.labels, [{
            label: 'Profesional',
            data: data.profesionales.data,
            backgroundColor: lightColorPalette[1],
        }], { indexAxis: 'y' });
        renderChart('obrasSocialesChart', 'bar', data.obrasSociales.labels, [{
            label: 'Obra Social',
            data: data.obrasSociales.data,
            backgroundColor: lightColorPalette[2],
        }], { indexAxis: 'y' });
        renderChart('diasSemanaChart', 'bar', data.diasSemana.labels, [{
            label: 'Día de la Semana',
            data: data.diasSemana.data,
            backgroundColor: colorPalette[3],
        }]);

        document.getElementById('top-pacientes-list').innerHTML = data.topPacientes.map(p => `<li class="flex justify-between items-center p-3 bg-gray-50 rounded-md"><span>${p.nombre}</span><span class="font-bold text-teal-600 bg-teal-100 px-3 py-1 rounded-full text-sm">${p.cantidad} estudios</span></li>`).join('');
    }

    // Función para renderizar el gráfico avanzado del resumen (con filtros)
    function renderAdvancedChart() {
        if (charts['advancedChart']) {
            charts['advancedChart'].destroy();
        }

        const months = Object.keys(statsData);
        const chartLabels = months.map(month => monthNamesMap[month.toLowerCase()] || month);
        const datasets = [];

        selectedAdvancedObrasSociales.forEach((os, index) => {
            const monthlyData = months.map(month => {
                let totalForMonth = 0;
                const advancedData = statsData[month].datos_grafica_avanzada;
                selectedAdvancedServices.forEach(service => {
                    totalForMonth += (advancedData[service]?.[os] || 0);
                });
                return totalForMonth;
            });

            datasets.push({
                label: os,
                data: monthlyData,
                borderColor: extendedContrastingPalette[index % extendedContrastingPalette.length],
                tension: 0.2,
                fill: false
            });
        });

        const ctx = document.getElementById('advancedChart').getContext('2d');
        charts['advancedChart'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // Oculta la leyenda
                    },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleFont: { size: 14 },
                        bodyFont: { size: 12 },
                        padding: 10,
                        cornerRadius: 4,
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `  ${context.dataset.label}: ${context.raw} prácticas`;
                            }
                        }
                    },
                    datalabels: getDatalabelsOptions('line')
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#e2e8f0' },
                        ticks: { color: '#64748b' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#64748b' }
                    }
                },
            }
        });

        createFilterButtons('advanced-service-filter-buttons', allServices, selectedAdvancedServices, (item) => {
            toggleFilter(item, selectedAdvancedServices);
            renderAdvancedChart();
        });
        createFilterButtons('advanced-os-filter-buttons', allObrasSociales, selectedAdvancedObrasSociales, (item) => {
            toggleFilter(item, selectedAdvancedObrasSociales);
            renderAdvancedChart();
        });
    }
    
    function renderEvolutionChart() {
        if (charts['evolutionChart']) {
            charts['evolutionChart'].destroy();
        }

        const months = Object.keys(statsData);
        const chartLabels = months.map(month => monthNamesMap[month.toLowerCase()] || month);

        const datasets = [];

        if (selectedEvolutionFilters.includes('practicas')) {
            datasets.push({
                label: 'Prácticas Realizadas',
                data: months.map(month => statsData[month].kpis.practicas),
                borderColor: contrastingLinePalette[0],
                backgroundColor: 'rgba(230, 57, 70, 0.2)',
                tension: 0.2,
                fill: true
            });
        }
        
        if (selectedEvolutionFilters.includes('pacientes')) {
            datasets.push({
                label: 'Pacientes Únicos',
                data: months.map(month => statsData[month].kpis.pacientes),
                borderColor: contrastingLinePalette[1],
                backgroundColor: 'rgba(69, 123, 157, 0.2)',
                tension: 0.2,
                fill: true
            });
        }

        renderChart('evolutionChart', 'line', chartLabels, datasets, { plugins: { legend: { display: false } }});

        // Vuelve a crear los botones de filtro con el estado actualizado
        const filterOptions = [
            { label: 'Prácticas', value: 'practicas', color: contrastingLinePalette[0] },
            { label: 'Pacientes', value: 'pacientes', color: contrastingLinePalette[1] }
        ];

        const filterContainer = document.getElementById('evolution-filter-buttons');
        filterContainer.innerHTML = '';
        filterOptions.forEach(option => {
            const button = document.createElement('button');
            button.textContent = option.label;
            const isActive = selectedEvolutionFilters.includes(option.value);
            const activeClass = isActive ? `bg-[${option.color}] text-white border-[${option.color}]` : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100';
            button.className = `px-3 py-1 text-sm font-medium border rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50 ${activeClass}`;
            button.style.borderColor = option.color; // Asignar color de borde
            button.style.color = isActive ? 'white' : option.color; // Asignar color de texto
            button.style.backgroundColor = isActive ? option.color : 'white'; // Asignar color de fondo
            button.addEventListener('click', () => {
                toggleFilter(option.value, selectedEvolutionFilters);
                renderEvolutionChart();
            });
            filterContainer.appendChild(button);
        });
    }
    
    function renderServiceEvolutionChart() {
        if (charts['serviceEvolutionChart']) {
            charts['serviceEvolutionChart'].destroy();
        }

        const months = Object.keys(statsData);
        const chartLabels = months.map(month => monthNamesMap[month.toLowerCase()] || month);
        const allServiceTypes = ["Eco Doppler", "Ecografía", "Radiología", "Resonancia", "Tomografía"];

        const datasets = [];

        allServiceTypes.forEach((service, index) => {
            if (selectedServiceEvolutionFilters.includes(service)) {
                datasets.push({
                    label: service,
                    data: months.map(month => {
                        const monthlyServiceData = {};
                        statsData[month].tipoServicio.labels.forEach((label, idx) => {
                            monthlyServiceData[label] = statsData[month].tipoServicio.data[idx];
                        });
                        return monthlyServiceData[service] || 0;
                    }),
                    borderColor: contrastingLinePalette[index % contrastingLinePalette.length],
                    tension: 0.2,
                    fill: false
                });
            }
        });

        renderChart('serviceEvolutionChart', 'line', chartLabels, datasets, { plugins: { legend: { display: false } }});
        
        // Renderizar los botones de filtro
        createFilterButtons('serviceEvolution-filter-buttons', allServiceTypes, selectedServiceEvolutionFilters, (item) => {
            toggleFilter(item, selectedServiceEvolutionFilters);
            renderServiceEvolutionChart();
        }, contrastingLinePalette);
    }
    
    function showSummaryView() {
        const months = Object.keys(statsData);
        const summary = {
            totalPracticas: 0,
            totalPacientes: 0,
            evolution: {
                labels: [],
                practicas: [],
                pacientes: []
            }
        };

        const serviceEvolution = {};
        const allServiceTypes = ["Eco Doppler", "Ecografía", "Radiología", "Resonancia", "Tomografía"];
        allServiceTypes.forEach(service => serviceEvolution[service] = []);

        months.forEach(month => {
            const data = statsData[month];
            summary.totalPracticas += data.kpis.practicas;
            summary.totalPacientes += data.kpis.pacientes;
            summary.evolution.labels.push(monthNamesMap[month.toLowerCase()] || month.charAt(0).toUpperCase() + month.slice(1));
            summary.evolution.practicas.push(data.kpis.practicas);
            summary.evolution.pacientes.push(data.kpis.pacientes);

            const monthlyServiceData = {};
            data.tipoServicio.labels.forEach((label, index) => {
                monthlyServiceData[label] = data.tipoServicio.data[index];
            });
            allServiceTypes.forEach(service => {
                serviceEvolution[service].push(monthlyServiceData[service] || 0);
            });
        });

        const mesPicoPracticas = summary.evolution.labels[summary.evolution.practicas.indexOf(Math.max(...summary.evolution.practicas))];
        const promedioGeneral = (summary.totalPracticas / summary.totalPacientes).toFixed(2);
        const kpiContainer = document.getElementById('kpi-container');
        kpiContainer.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8';
        kpiContainer.innerHTML = `
            <div class="kpi-card"><div class="kpi-icon bg-teal-100 text-teal-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></div><div><p class="text-sm text-gray-500">Total Prácticas</p><p class="text-2xl font-bold text-gray-800">${summary.totalPracticas}</p></div></div>
            <div class="kpi-card"><div class="kpi-icon bg-cyan-100 text-cyan-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg></div><div><p class="text-sm text-gray-500">Total Pacientes</p><p class="text-2xl font-bold text-gray-800">${summary.totalPacientes}</p></div></div>
            <div class="kpi-card"><div class="kpi-icon bg-teal-100 text-teal-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div><div><p class="text-sm text-gray-500">Mes con Más Prácticas</p><p class="text-2xl font-bold text-gray-800">${mesPicoPracticas}</p></div></div>
            <div class="kpi-card"><div class="kpi-icon bg-cyan-100 text-cyan-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg></div><div><p class="text-sm text-gray-500">Promedio General</p><p class="text-2xl font-bold text-gray-800">${promedioGeneral}</p></div></div>
        `;

        document.getElementById('charts-grid').innerHTML = `
            <div class="bg-white p-6 rounded-xl shadow-sm lg:col-span-2">
                <h2 class="text-xl font-semibold text-gray-700">Evolución Mensual General</h2>
                <p class="text-sm text-gray-500 mb-4">Muestra la cantidad de prácticas o pacientes únicos por mes.</p>
                <div id="evolution-filter-buttons" class="flex flex-wrap gap-2 mb-4"></div>
                <div class="chart-container" style="height: 400px;"><canvas id="evolutionChart"></canvas></div>
            </div>
            <div class="bg-white p-6 rounded-xl shadow-sm lg:col-span-2">
                <h2 class="text-xl font-semibold text-gray-700">Evolución Mensual por Tipo de Servicio</h2>
                <p class="text-sm text-gray-500 mb-4">Variación en la cantidad de estudios para cada servicio a lo largo de los meses.</p>
                <div id="serviceEvolution-filter-buttons" class="flex flex-wrap gap-2 mb-4"></div>
                <div class="chart-container" style="height: 400px;"><canvas id="serviceEvolutionChart"></canvas></div>
            </div>
            <div id="advanced-chart-container" class="bg-white p-6 rounded-xl shadow-sm lg:col-span-2">
                <h2 class="text-xl font-semibold text-gray-700">Evolución Mensual Detallada por Servicio y Obra Social</h2>
                <p class="text-sm text-gray-500 mb-4">Análisis de la variación de prácticas según tipo de estudio y obra social, mes a mes.</p>
                
                <div class="mb-4">
                    <p class="text-sm font-semibold text-gray-600 mb-2">Filtrar por Tipo de Servicio:</p>
                    <div id="advanced-service-filter-buttons" class="flex flex-wrap gap-2"></div>
                </div>

                <div class="chart-container" style="height: 400px;"><canvas id="advancedChart"></canvas></div>

                <div class="mt-4">
                    <p class="text-sm font-semibold text-gray-600 mb-2">Filtrar por Obra Social:</p>
                    <div id="advanced-os-filter-buttons" class="flex flex-wrap gap-2"></div>
                </div>
            </div>
        `;

        renderEvolutionChart();

        // Inicializar los filtros avanzados del resumen
        if (allServices.length === 0) {
            months.forEach(month => {
                const advancedData = statsData[month].datos_grafica_avanzada;
                Object.keys(advancedData).forEach(service => {
                    if (!allServices.includes(service)) allServices.push(service);
                    Object.keys(advancedData[service]).forEach(os => {
                        if (!allObrasSociales.includes(os)) allObrasSociales.push(os);
                    });
                });
            });
            selectedAdvancedServices = [...allServices];
            selectedAdvancedObrasSociales = [...allObrasSociales];
        }

        renderServiceEvolutionChart();
        renderAdvancedChart();
    }

    function switchView(view, month = null) {
        clearFilterMessage();
        document.querySelectorAll('#view-selector button').forEach(button => {
            button.classList.toggle('tab-active', button.dataset.view === view && button.dataset.month === month);
        });
        if (view === 'summary') {
            showSummaryView();
        } else if (view === 'monthly' && month) {
            showMonthlyView(month);
        }
    }

    function initializeDashboard() {
        Chart.register(ChartDataLabels);
        const viewSelector = document.getElementById('view-selector');
        viewSelector.innerHTML = '';
        const months = Object.keys(statsData);
        const summaryButton = document.createElement('button');
        summaryButton.textContent = 'Resumen General';
        summaryButton.dataset.view = 'summary';
        summaryButton.dataset.month = 'null';
        summaryButton.className = 'px-4 py-2 text-sm font-medium border rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50';
        summaryButton.addEventListener('click', () => switchView('summary'));
        viewSelector.appendChild(summaryButton);
        months.forEach(month => {
            const spanishMonth = monthNamesMap[month.toLowerCase()] || month;
            const button = document.createElement('button');
            button.textContent = spanishMonth;
            button.dataset.view = 'monthly';
            button.dataset.month = month;
            button.className = 'px-4 py-2 text-sm font-medium border rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50';
            button.addEventListener('click', () => switchView('monthly', month));
            viewSelector.appendChild(button);
        });
        clearFilterBtn.addEventListener('click', clearFilterMessage);
        switchView('summary');
    }
});
