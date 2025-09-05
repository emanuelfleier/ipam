import { Utils } from './utils.js';

// Registra el plugin de datalabels con Chart.js para que esté disponible en todos los gráficos.
Chart.register(ChartDataLabels);

let charts = {};
let activeYear = null;

/**
 * Módulo para la visualización del dashboard.
 */
export const Views = {
    // Referencias a elementos del DOM
    elements: {
        yearSelector: document.getElementById('year-selector'),
        actionsSelector: document.getElementById('actions-selector'),
        kpiContainer: document.getElementById('kpi-container'),
        chartsGrid: document.getElementById('charts-grid'),
        filterBar: document.getElementById('filter-bar'),
        filterText: document.getElementById('filter-text'),
        clearFilterBtn: document.getElementById('clear-filter-btn')
    },

    /**
     * Renderiza un gráfico de Chart.js.
     */
    renderChart(canvasId, type, labels, datasets, chartTitle, options = {}) {
        if (charts[canvasId]) {
            charts[canvasId].destroy();
        }
        const ctx = document.getElementById(canvasId).getContext('2d');

        // Configuración base de los datalabels para reutilizar en todos los gráficos de barra y dona
        const datalabelsBarDoughnutConfig = {
            color: (context) => {
                const backgroundColor = context.dataset.backgroundColor[context.dataIndex] || context.dataset.backgroundColor;
                return Utils.isLight(backgroundColor) ? '#333' : '#fff';
            },
            font: { weight: 'bold' },
            formatter: (value) => value === 0 ? '' : value,
            anchor: 'end',
            align: 'end',
            offset: 4, // Valor reducido para que el recuadro quede cerca
            backgroundColor: (context) => context.dataset.backgroundColor[context.dataIndex],
            borderRadius: 6,
            padding: 6,
            borderColor: (context) => context.dataset.backgroundColor[context.dataIndex],
            borderWidth: 2,
        };

        // Configuración para gráficos de línea
        const datalabelsLineConfig = {
            align: 'end',
            anchor: 'end',
            clamp: true, // <-- AÑADIR ESTA LÍNEA
            backgroundColor: (context) => context.dataset.borderColor,
            borderRadius: 4,
            color: 'white',
            font: { weight: 'bold', size: 10 },
            padding: 4
        };

        const defaultPlugins = {
            legend: { position: 'top', labels: { color: '#475569' } },
            tooltip: { backgroundColor: '#1e293b', titleFont: { size: 14 }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 4, mode: 'index', intersect: false },
            datalabels: (type === 'line') ? datalabelsLineConfig : datalabelsBarDoughnutConfig
        };

        // Opciones base del gráfico
        const defaultOptionsBase = {
            responsive: true,
            maintainAspectRatio: false,
            layout: { // <-- AÑADIR ESTE BLOQUE
                padding: {
                    top: 20 // Píxeles de espacio extra en la parte superior
                }
            },
            plugins: defaultPlugins,
            scales: (type === 'bar' || type === 'line') ? {
                y: { beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { color: '#64748b' } },
                x: { grid: { display: false }, ticks: { color: '#64748b' } }
            } : {},
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const label = evt.chart.data.labels[index];
                    // console.log(`Elemento clicado: ${label}`);
                }
            },
        };

        // Creamos una copia de las opciones base para evitar modificar el objeto original
        const finalOptions = {
            ...defaultOptionsBase,
            ...options,
            plugins: {
                ...defaultOptionsBase.plugins,
                ...options.plugins,
                datalabels: {
                    ...defaultOptionsBase.plugins.datalabels,
                    ...(options.plugins ? options.plugins.datalabels : {})
                }
            }
        };

        // Ajustes específicos para gráficos de dona y sin leyenda
        if (type === 'doughnut') {
            finalOptions.plugins.legend.position = 'right';
        } else if (datasets.length <= 1 && type !== 'line') {
            finalOptions.plugins.legend.display = false;
        }

        // Ajustes específicos para gráficos de barra horizontal
        if (options.indexAxis === 'y') {
            finalOptions.scales = {
                x: { beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { color: '#64748b' } },
                y: { grid: { display: false }, ticks: { color: '#64748b' } }
            };
        }

        charts[canvasId] = new Chart(ctx, {
            type,
            data: { labels, datasets },
            options: finalOptions
        });
    },

    /**
     * Muestra la vista mensual del dashboard.
     */
    showMonthlyView(year, month) {
        const data = Utils.statsData[year][month];
        if (!data) return;

        const months = Object.keys(Utils.statsData[year]);
        const currentMonthIndex = months.indexOf(month);
        const previousMonthData = currentMonthIndex > 0 ? Utils.statsData[year][months[currentMonthIndex - 1]] : null;

        const practicasIndicator = Utils.getChangeIndicator(data.kpis.practicas, previousMonthData ? previousMonthData.kpis.practicas : null);
        const pacientesIndicator = Utils.getChangeIndicator(data.kpis.pacientes, previousMonthData ? previousMonthData.kpis.pacientes : null);
        const maxServiceIndex = data.tipoServicio.data.indexOf(Math.max(...data.tipoServicio.data));
        const servicioPrincipal = data.tipoServicio.labels[maxServiceIndex];
        const maxDayIndex = data.diasSemana.data.indexOf(Math.max(...data.diasSemana.data));
        const diaPico = data.diasSemana.labels[maxDayIndex];
        const maxOsIndex = data.obrasSociales.data.indexOf(Math.max(...data.obrasSociales.data));
        const osPrincipal = data.obrasSociales.labels[maxOsIndex];

        this.elements.kpiContainer.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8';
        this.elements.kpiContainer.innerHTML = `
            <div class="kpi-card"><div class="kpi-icon bg-teal-100 text-teal-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg></div><div><p class="text-sm text-gray-500">Total Prácticas</p><div class="flex items-baseline"><p class="text-2xl font-bold text-gray-800">${data.kpis.practicas}</p>${practicasIndicator}</div></div></div>
            <div class="kpi-card"><div class="kpi-icon bg-cyan-100 text-cyan-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg></div><div><p class="text-sm text-gray-500">Pacientes Únicos</p><div class="flex items-baseline"><p class="text-2xl font-bold text-gray-800">${data.kpis.pacientes}</p>${pacientesIndicator}</div></div></div>
            <div class="kpi-card"><div class="kpi-icon bg-teal-100 text-teal-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg></div><div><p class="text-sm text-gray-500">Promedio x Paciente</p><p class="text-2xl font-bold text-gray-800">${data.kpis.promedio}</p></div></div>
            <div class="kpi-card"><div class="kpi-icon bg-cyan-100 text-cyan-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547a2 2 0 00-.547 1.806l.477 2.387a6 6 0 00.517 3.86l.158.318a6 6 0 003.86.517l2.387.477a2 2 0 001.806-.547a2 2 0 00.547-1.806l-.477-2.387a6 6 0 00-.517-3.86l-.158-.318a6 6 0 01-.517-3.86l.477-2.387a2 2 0 00.547-1.806z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8V4m0 4h4m-4 0L8 8" /></svg></div><div><p class="text-sm text-gray-500">Servicio Principal</p><p class="text-2xl font-bold text-gray-800">${servicioPrincipal}</p></div></div>
            <div class="kpi-card"><div class="kpi-icon bg-teal-100 text-teal-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 2 0 011 1v5m-4 0h4" /></svg></div><div class="min-w-0"><p class="text-sm text-gray-500">Obra Social Principal</p><p class="text-xl font-bold text-gray-800 truncate">${osPrincipal}</p></div></div>
            <div class="kpi-card"><div class="kpi-icon bg-cyan-100 text-cyan-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div><div><p class="text-sm text-gray-500">Día de Mayor Actividad</p><p class="text-2xl font-bold text-gray-800">${diaPico}</p></div></div>
        `;

        this.elements.chartsGrid.innerHTML = `
            <div class="bg-white p-6 rounded-xl shadow-sm"><h2 class="text-xl font-semibold text-gray-700">Origen de Prácticas</h2><p class="text-sm text-gray-500 mb-4">Distribución de estudios por el medio de solicitud.</p><div class="chart-container"><canvas id="origenChart"></canvas></div></div>
            <div class="bg-white p-6 rounded-xl shadow-sm"><h2 class="text-xl font-semibold text-gray-700">Prácticas por Tipo de Servicio</h2><p class="text-sm text-gray-500 mb-4">Cantidad de estudios realizados según el tipo de servicio.</p><div class="chart-container"><canvas id="tipoServicioChart"></canvas></div></div>
            <div class="bg-white p-6 rounded-xl shadow-sm"><h2 class="text-xl font-semibold text-gray-700">Actividad por Profesionales</h2><p class="text-sm text-gray-500 mb-4">Prácticas realizadas por los profesionales más activos.</p><div class="chart-container"><canvas id="profesionalesChart"></canvas></div></div>
            <div class="bg-white p-6 rounded-xl shadow-sm"><h2 class="text-xl font-semibold text-gray-700">Prácticas por Obra Social</h2><p class="text-sm text-gray-500 mb-4">Distribución de estudios por las principales obras sociales.</p><div class="chart-container"><canvas id="obrasSocialesChart"></canvas></div></div>
            <div class="bg-white p-6 rounded-xl shadow-sm"><h2 class="text-xl font-semibold text-gray-700">Prácticas por Día de la Semana</h2><p class="text-sm text-gray-500 mb-4">Cantidad de prácticas realizadas por día de la semana.</p><div class="chart-container"><canvas id="diasSemanaChart"></canvas></div></div>
            <div class="bg-white p-6 rounded-xl shadow-sm"><h2 class="text-xl font-semibold text-gray-700">Frecuencia de Pacientes</h2><p class="text-sm text-gray-500 mb-4">Cantidad de pacientes según la frecuencia de sus visitas.</p><div class="chart-container"><canvas id="frecuenciaChart"></canvas></div></div>
            <div class="bg-white p-6 rounded-xl shadow-sm lg:col-span-2"><h2 class="text-xl font-semibold text-gray-700">Top 10 Pacientes</h2><p class="text-sm text-gray-500 mb-4">Pacientes con mayor cantidad de estudios realizados.</p><ul id="top-pacientes-list" class="space-y-2"></ul></div>
        `;

        // Llama a la función renderChart para cada gráfico con sus datos específicos
        this.renderChart('origenChart', 'doughnut', data.origen.labels, [{
            label: 'Origen',
            data: data.origen.data,
            backgroundColor: Utils.config.colorPalette
        }], 'Origen', {
            // La única configuración que necesitamos es la posición de la leyenda
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        });
        this.renderChart('tipoServicioChart', 'bar', data.tipoServicio.labels, [{
            label: 'Estudios',
            data: data.tipoServicio.data,
            backgroundColor: Utils.config.colorPalette[0]
        }], 'Tipo de Servicio');
        this.renderChart('profesionalesChart', 'bar', data.profesionales.labels, [{
            label: 'Estudios',
            data: data.profesionales.data,
            backgroundColor: Utils.config.lightColorPalette[1]
        }], 'Profesional', { indexAxis: 'y' });
        this.renderChart('obrasSocialesChart', 'bar', data.obrasSociales.labels, [{
            label: 'Estudios',
            data: data.obrasSociales.data,
            backgroundColor: Utils.config.lightColorPalette[2]
        }], 'Obra Social', { indexAxis: 'y' });
        this.renderChart('diasSemanaChart', 'bar', data.diasSemana.labels, [{
            label: 'Estudios',
            data: data.diasSemana.data,
            backgroundColor: Utils.config.colorPalette[3]
        }], 'Día de la Semana');
        this.renderChart('frecuenciaChart', 'bar', data.frecuenciaPacientes.labels, [{
            label: 'Cantidad de Pacientes',
            data: data.frecuenciaPacientes.data,
            backgroundColor: Utils.config.colorPalette[4]
        }], 'Frecuencia');
        document.getElementById('top-pacientes-list').innerHTML = data.topPacientes.map(p => `<li class="flex justify-between items-center p-3 bg-gray-50 rounded-md"><span>${p.nombre}</span><span class="font-bold text-teal-600 bg-teal-100 px-3 py-1 rounded-full text-sm">${p.cantidad} estudios</span></li>`).join('');
    },

    /**
     * Muestra el resumen anual para un año específico.
     */





    
    showAnnualSummary(year) {
        const months = Object.keys(Utils.statsData[year]);
        const summary = {
            totalPracticas: 0,
            totalPacientes: 0,
            evolution: {
                labels: [],
                practicas: [],
                pacientes: []
            }
        };

        // --- CÁLCULOS INICIALES (sin cambios) ---
        // Se calcula la evolución general para los KPIs y el primer gráfico.
        const allServiceTypesForEvolution = new Set();
        months.forEach(month => {
            const data = Utils.statsData[year][month];
            summary.totalPracticas += data.kpis.practicas;
            summary.totalPacientes += data.kpis.pacientes;
            summary.evolution.labels.push(Utils.monthNamesMap[month.toLowerCase()] || month);
            summary.evolution.practicas.push(data.kpis.practicas);
            summary.evolution.pacientes.push(data.kpis.pacientes);
            data.tipoServicio.labels.forEach(label => allServiceTypesForEvolution.add(label));
        });
        
        const mesPicoPracticas = summary.evolution.labels[summary.evolution.practicas.indexOf(Math.max(...summary.evolution.practicas))];
        const promedioGeneral = (summary.totalPracticas / summary.totalPacientes).toFixed(2);

        // --- RENDERIZADO DE KPIs Y GRÁFICOS INICIALES (sin cambios) ---
        this.elements.kpiContainer.innerHTML = `
            <div class="kpi-card"><div class="kpi-icon bg-teal-100 text-teal-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></div><div><p class="text-sm text-gray-500">Total Prácticas</p><p class="text-2xl font-bold text-gray-800">${summary.totalPracticas}</p></div></div>
            <div class="kpi-card"><div class="kpi-icon bg-cyan-100 text-cyan-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg></div><div><p class="text-sm text-gray-500">Total Pacientes</p><p class="text-2xl font-bold text-gray-800">${summary.totalPacientes}</p></div></div>
            <div class="kpi-card"><div class="kpi-icon bg-teal-100 text-teal-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div><div><p class="text-sm text-gray-500">Mes con Más Prácticas</p><p class="text-2xl font-bold text-gray-800">${mesPicoPracticas}</p></div></div>
            <div class="kpi-card"><div class="kpi-icon bg-cyan-100 text-cyan-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg></div><div><p class="text-sm text-gray-500">Promedio General</p><p class="text-2xl font-bold text-gray-800">${promedioGeneral}</p></div></div>
        `;
        
        // El HTML se mantiene igual, ya que los contenedores ya están en la posición correcta.
        this.elements.chartsGrid.innerHTML = `
            <div class="bg-white p-6 rounded-xl shadow-sm lg:col-span-2"><h2 class="text-xl font-semibold text-gray-700">Evolución Mensual General</h2><p class="text-sm text-gray-500 mb-4">Comparativa de prácticas realizadas y pacientes únicos atendidos por mes.</p><div class="chart-container" style="height: 400px;"><canvas id="evolutionChart"></canvas></div></div>
            <div class="bg-white p-6 rounded-xl shadow-sm lg:col-span-2">
                <div class="mb-4">
                    <h2 class="text-xl font-semibold text-gray-700">Evolución de Servicios por Obra Social</h2>
                    <p class="text-sm text-gray-500">Selecciona uno o varios servicios y obras sociales para visualizar los datos.</p>
                </div>
                <div id="service-filters-container" class="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4"></div>
                <div class="chart-container" style="height: 400px;"><canvas id="servicioPorOSChart"></canvas></div>
                <div id="os-filters-container" class="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4"></div>
            </div>
            <!-- === NUEVA SECCIÓN: GRÁFICO INVERTIDO === -->
            <div class="bg-white p-6 rounded-xl shadow-sm lg:col-span-2">
                <div class="mb-4">
                    <h2 class="text-xl font-semibold text-gray-700">Evolución de Obra social por Servicio</h2>
                    <p class="text-sm text-gray-500">Selecciona una o varias obras sociales y servicios para visualizar los datos.</p>
                </div>
                <div id="os-filters-container-2" class="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4"></div>
                <div class="chart-container" style="height: 400px;"><canvas id="osPorServicioChart"></canvas></div>
                <div id="service-filters-container-2" class="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4"></div>
            </div>
            <!-- === FIN DE NUEVA SECCIÓN === -->
        `;
        this.renderChart('evolutionChart', 'line', summary.evolution.labels, [{
            label: 'Prácticas Realizadas', data: summary.evolution.practicas, borderColor: Utils.config.colorPalette[0], backgroundColor: 'rgba(15, 118, 110, 0.2)', tension: 0.2, fill: true
        }, {
            label: 'Pacientes Únicos', data: summary.evolution.pacientes, borderColor: Utils.config.colorPalette[2], backgroundColor: 'rgba(29, 78, 216, 0.2)', tension: 0.2, fill: true
        }], 'Evolución');
        
        // ---- LÓGICA EXISTENTE PARA EL GRÁFICO FILTRADO "Servicio por OS" ----
        
        // 1. Obtener todos los servicios y obras sociales únicos del año
        const allObrasSociales = new Set();
        const allServiceTypes = new Set();
        months.forEach(month => {
            const monthData = Utils.statsData[year][month];
            if (monthData && monthData.servicioPorObraSocial) {
                Object.keys(monthData.servicioPorObraSocial).forEach(os => {
                    allObrasSociales.add(os);
                    monthData.servicioPorObraSocial[os].labels.forEach(service => allServiceTypes.add(service));
                });
            }
        });

        const uniqueObrasSociales = Array.from(allObrasSociales).sort();
        const uniqueServiceTypes = Array.from(allServiceTypes).sort();

        // 2. Definir estado inicial de los filtros (todo seleccionado por defecto)
        let activeServices = [...uniqueServiceTypes];
        let activeOses = [...uniqueObrasSociales];

        const serviceFiltersContainer = document.getElementById('service-filters-container');
        const osFiltersContainer = document.getElementById('os-filters-container');

        // 3. Lógica de renderizado del gráfico (MODIFICADA)
        const renderFilteredChart = () => {
            const datasets = [];

            // **MODIFICACIÓN CLAVE**: Si no hay servicios seleccionados, no se muestra ninguna línea.
            if (activeServices.length === 0) {
                this.renderChart('servicioPorOSChart', 'line', summary.evolution.labels, [], 'Evolución por Servicio y Obra Social', {
                    plugins: { legend: { display: false } }
                });
                return;
            }

            // **MODIFICACIÓN CLAVE**: Crear una línea por servicio, sumando los datos de las OS activas.
            activeServices.forEach(service => {
                const colorIndex = uniqueServiceTypes.indexOf(service);
                const serviceColor = Utils.config.colorPalette[colorIndex % Utils.config.colorPalette.length];

                const monthlyData = months.map(month => {
                    let totalForMonth = 0;
                    // Sumar solo si hay obras sociales seleccionadas
                    if (activeOses.length > 0) {
                        activeOses.forEach(os => {
                            const osData = Utils.statsData[year][month]?.servicioPorObraSocial?.[os];
                            if (osData) {
                                const serviceIndex = osData.labels.indexOf(service);
                                if (serviceIndex !== -1) {
                                    totalForMonth += osData.data[serviceIndex];
                                }
                            }
                        });
                    }
                    return totalForMonth;
                });
                
                datasets.push({
                    label: service,
                    data: monthlyData,
                    borderColor: serviceColor,
                    backgroundColor: `${serviceColor}33`, // Color semitransparente para el relleno
                    borderWidth: 2.5,
                    tension: 0.3,
                    fill: true
                });
            });

            this.renderChart('servicioPorOSChart', 'line', summary.evolution.labels, datasets, 'Evolución por Servicio y Obra Social', {
                plugins: {
                    // **REQUERIMIENTO**: La leyenda se deshabilita para dar lugar a los filtros.
                    legend: {
                        display: false
                    }
                }
            });
        };
        
        // 4. Función para crear los botones de filtro (sin cambios en su lógica interna)
        const populateFilters = (container, items, stateArray, palette) => {
            container.innerHTML = '';
            items.forEach((item, index) => {
                const color = palette[index % palette.length];
                const btn = document.createElement('span');
                btn.className = 'filter-btn active';
                btn.dataset.value = item;

                const dot = document.createElement('span');
                dot.className = 'filter-btn-dot';
                
                // Función interna para aplicar estilos según si está activo o no
                const setButtonStyle = (isActive) => {
                    if (isActive) {
                        btn.style.backgroundColor = color;
                        btn.style.color = '#fff';
                        btn.style.borderColor = color;
                        dot.style.backgroundColor = '#fff';
                    } else {
                        btn.style.backgroundColor = '#f1f5f9';
                        btn.style.color = color;
                        btn.style.borderColor = '#e2e8f0';
                        dot.style.backgroundColor = color;
                    }
                };

                setButtonStyle(true); // Estilo inicial activo
                btn.appendChild(dot);
                btn.appendChild(document.createTextNode(item));

                btn.addEventListener('click', () => {
                    const value = btn.dataset.value;
                    const stateIndex = stateArray.indexOf(value);

                    if (stateIndex > -1) {
                        stateArray.splice(stateIndex, 1);
                    } else {
                        stateArray.push(value);
                    }
                    
                    btn.classList.toggle('active');
                    setButtonStyle(btn.classList.contains('active'));
                    renderFilteredChart(); // Volver a renderizar el gráfico con los nuevos filtros
                });

                container.appendChild(btn);
            });
        };
        
        // 5. Poblar los filtros y renderizar el gráfico por primera vez
        populateFilters(serviceFiltersContainer, uniqueServiceTypes, activeServices, Utils.config.colorPalette);
        const offsetPalette = [...Utils.config.colorPalette.slice(3), ...Utils.config.colorPalette.slice(0, 3)];
        populateFilters(osFiltersContainer, uniqueObrasSociales, activeOses, offsetPalette);
        
        renderFilteredChart();


        // === NUEVA LÓGICA PARA EL GRÁFICO INVERTIDO "OS por Servicio" ===
        const osFiltersContainer2 = document.getElementById('os-filters-container-2');
        const serviceFiltersContainer2 = document.getElementById('service-filters-container-2');

        let activeOses2 = [...uniqueObrasSociales];
        let activeServices2 = [...uniqueServiceTypes];

        const renderFilteredOSChart = () => {
            const datasets = [];

            if (activeOses2.length === 0) {
                this.renderChart('osPorServicioChart', 'line', summary.evolution.labels, [], 'Evolución de Obra Social por Servicio', {
                    plugins: { legend: { display: false } }
                });
                return;
            }

            activeOses2.forEach(os => {
                const colorIndex = uniqueObrasSociales.indexOf(os);
                const osColor = Utils.config.colorPalette[colorIndex % Utils.config.colorPalette.length];

                const monthlyData = months.map(month => {
                    let totalForMonth = 0;
                    if (activeServices2.length > 0) {
                        activeServices2.forEach(service => {
                            const osData = Utils.statsData[year][month]?.servicioPorObraSocial?.[os];
                            if (osData) {
                                const serviceIndex = osData.labels.indexOf(service);
                                if (serviceIndex !== -1) {
                                    totalForMonth += osData.data[serviceIndex];
                                }
                            }
                        });
                    }
                    return totalForMonth;
                });
                
                datasets.push({
                    label: os,
                    data: monthlyData,
                    borderColor: osColor,
                    backgroundColor: `${osColor}33`,
                    borderWidth: 2.5,
                    tension: 0.3,
                    fill: true
                });
            });

            this.renderChart('osPorServicioChart', 'line', summary.evolution.labels, datasets, 'Evolución de Obra Social por Servicio', {
                plugins: {
                    legend: {
                        display: false
                    }
                }
            });
        };

        const populateFilters2 = (container, items, stateArray, palette, isServiceFilter) => {
            container.innerHTML = '';
            items.forEach((item, index) => {
                const color = palette[index % palette.length];
                const btn = document.createElement('span');
                btn.className = 'filter-btn active';
                btn.dataset.value = item;

                const dot = document.createElement('span');
                dot.className = 'filter-btn-dot';
                
                const setButtonStyle = (isActive) => {
                    if (isActive) {
                        btn.style.backgroundColor = color;
                        btn.style.color = '#fff';
                        btn.style.borderColor = color;
                        dot.style.backgroundColor = '#fff';
                    } else {
                        btn.style.backgroundColor = '#f1f5f9';
                        btn.style.color = color;
                        btn.style.borderColor = '#e2e8f0';
                        dot.style.backgroundColor = color;
                    }
                };

                setButtonStyle(true);
                btn.appendChild(dot);
                btn.appendChild(document.createTextNode(item));

                btn.addEventListener('click', () => {
                    const value = btn.dataset.value;
                    const stateIndex = stateArray.indexOf(value);

                    if (stateIndex > -1) {
                        stateArray.splice(stateIndex, 1);
                    } else {
                        stateArray.push(value);
                    }
                    
                    btn.classList.toggle('active');
                    setButtonStyle(btn.classList.contains('active'));
                    renderFilteredOSChart();
                });

                container.appendChild(btn);
            });
        };
        
        populateFilters2(osFiltersContainer2, uniqueObrasSociales, activeOses2, offsetPalette, false);
        populateFilters2(serviceFiltersContainer2, uniqueServiceTypes, activeServices2, Utils.config.colorPalette, true);
        
        renderFilteredOSChart();
    },
    /**
     * Alterna la vista del dashboard.
     */
    switchView(view, year, month = null) {
        
        // Lógica de resaltado para los botones de años
        document.querySelectorAll('#year-selector button').forEach(button => {
            const isTotalButton = button.dataset.view === 'total';
            const isActiveYear = button.dataset.year === year;
            
            button.classList.toggle('bg-teal-600', isActiveYear);
            button.classList.toggle('text-white', isActiveYear);
            button.classList.toggle('bg-gray-200', !isActiveYear);
            button.classList.toggle('text-gray-600', !isActiveYear);
        });

        // Lógica de resaltado para los botones de acción
        document.querySelectorAll('#actions-selector button').forEach(button => {
            let isActive = false;
            if (view === 'total' && button.dataset.view === 'total') {
                isActive = true;
            } else if (view === 'annual' && button.dataset.view === 'annual') {
                isActive = true;
            } else if (view === 'monthly' && button.dataset.view === 'monthly' && button.dataset.month === month) {
                isActive = true;
            }
            button.classList.toggle('bg-teal-600', isActive);
            button.classList.toggle('text-white', isActive);
            button.classList.toggle('bg-gray-200', !isActive);
            button.classList.toggle('text-gray-600', !isActive);
        });

        if (view === 'total') {
            this.showTotalSummary();
        } else if (view === 'annual') {
            this.showAnnualSummary(year);
        } else if (view === 'monthly') {
            this.showMonthlyView(year, month);
        }
    },

    /**
     * Inicializa los botones para el año seleccionado.
     */
    initializeDashboardButtons(year) {
        this.elements.actionsSelector.innerHTML = '';
        
        const annualSummaryButton = document.createElement('button');
        annualSummaryButton.textContent = `Resumen ${year}`;
        annualSummaryButton.dataset.view = 'annual';
        annualSummaryButton.dataset.year = year;
        annualSummaryButton.className = 'px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50';
        annualSummaryButton.addEventListener('click', () => this.switchView('annual', year));
        this.elements.actionsSelector.appendChild(annualSummaryButton);

        const orderedMonths = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
        
        const availableMonths = Object.keys(Utils.statsData[year]);
        
        orderedMonths.forEach(month => {
            if (availableMonths.includes(month)) {
                const button = document.createElement('button');
                button.textContent = month;
                button.dataset.view = 'monthly';
                button.dataset.year = year;
                button.dataset.month = month;
                button.className = 'px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50';
                button.addEventListener('click', () => this.switchView('monthly', year, month));
                this.elements.actionsSelector.appendChild(button);
            }
        });
    },

    /**
     * Inicializa los botones de selección de año.
     */
    initializeYearButtons() {
        this.elements.yearSelector.innerHTML = '';
        this.elements.actionsSelector.innerHTML = '';

        const years = Object.keys(Utils.statsData).sort();

        const totalSummaryButton = document.createElement('button');
        totalSummaryButton.textContent = 'Resumen Total';
        totalSummaryButton.dataset.view = 'total';
        totalSummaryButton.className = 'px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50';
        totalSummaryButton.addEventListener('click', () => {
            activeYear = null;
            this.elements.actionsSelector.innerHTML = '';
            this.switchView('total', null);
        });
        this.elements.yearSelector.appendChild(totalSummaryButton);

        years.forEach(year => {
            const button = document.createElement('button');
            button.textContent = year;
            button.dataset.year = year;
            button.className = 'px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50';
            button.addEventListener('click', () => {
                activeYear = year;
                this.initializeDashboardButtons(year);
                this.switchView('annual', year);
            });
            this.elements.yearSelector.appendChild(button);
        });
    },
};
