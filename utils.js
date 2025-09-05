export const Utils = {
    // La contraseña sigue aquí, por lo que es importante tenerlo en cuenta
    config: {
        password: 'ipam3125',
        colorPalette: ['#14b8a6', '#06b6d4', '#475569', '#3b82f6', '#10b981'],
        lightColorPalette: ['#ccfbf1', '#cffafe', '#e2e8f0', '#bfdbfe', '#d1fae5']
    },
    // Objeto para almacenar los datos procesados, ahora con estructura por año
    statsData: {},
    monthNamesMap: {
        'enero': 'Enero', 'febrero': 'Febrero', 'marzo': 'Marzo', 'abril': 'Abril',
        'mayo': 'Mayo', 'junio': 'Junio', 'julio': 'Julio', 'agosto': 'Agosto',
        'septiembre': 'Septiembre', 'octubre': 'Octubre', 'noviembre': 'Noviembre', 'diciembre': 'Diciembre'
    },

    /**
     * Autentica al usuario.
     */
    async authenticateUser(enteredPassword) {
        if (enteredPassword !== this.config.password) {
            throw new Error('Contraseña incorrecta.');
        }
    },

    /**
     * Carga y procesa los datos desde data.json.
     */
    async loadData() {
        try {
            const response = await fetch('./data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            // La estructura ya viene agrupada por año desde el script de Python
            this.statsData = data;

        } catch (error) {
            console.error('Error al cargar los datos:', error);
            throw new Error('No se pudo cargar el archivo de datos.');
        }
    },

    /**
     * Calcula y retorna un indicador de cambio (positivo o negativo).
     */
    getChangeIndicator(currentValue, previousValue) {
        if (previousValue === null) {
            return `<span class="text-sm font-semibold text-gray-500 ml-2">Nuevo</span>`;
        }
        const change = currentValue - previousValue;
        if (change > 0) {
            return `<span class="text-green-500 text-sm font-semibold ml-2 inline-flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg> +${change}</span>`;
        } else if (change < 0) {
            return `<span class="text-red-500 text-sm font-semibold ml-2 inline-flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg> ${change}</span>`;
        } else {
            return `<span class="text-gray-500 text-sm font-semibold ml-2">0</span>`;
        }
    },

    /**
     * Comprueba si un color es claro.
     */
    isLight(color) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 150;
    }
};
