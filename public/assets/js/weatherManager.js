/**
 * WeatherManager - Gerenciador de Clima
 * Responsável por buscar e exibir informações meteorológicas
 */

export class WeatherManager {
    constructor(barracaData) {
        this.barracaData = barracaData;
        this.apiKey = '80561fda732a4d389ee00703252311';
        this.coords = { lat: -12.9985, lng: -38.5230 }; // Coordenadas padrão (Salvador)
    }

    /**
     * Inicializa o sistema de clima
     */
    async init() {
        // Usar coordenadas da barraca se disponíveis
        if (this.barracaData.latitude && this.barracaData.longitude) {
            this.coords = {
                lat: this.barracaData.latitude,
                lng: this.barracaData.longitude
            };
            console.log('[WeatherManager] Usando coordenadas do banco:', this.coords);
        } else {
            console.warn('[WeatherManager] Usando coordenadas padrão para clima');
        }

        await this.loadWeatherData();
        this.initWeatherToggle();
    }

    /**
     * Busca dados meteorológicos da API
     */
    async loadWeatherData() {
        const url = `https://api.weatherapi.com/v1/forecast.json?key=${this.apiKey}&q=${this.coords.lat},${this.coords.lng}&days=3&lang=pt`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Falha na API do tempo');

            const data = await response.json();
            
            this.renderCurrentWeather(data.current);
            this.renderForecast(data.forecast.forecastday);

        } catch (error) {
            console.error('[WeatherManager] Erro ao buscar dados:', error);
            this.showError();
        }
    }

    /**
     * Renderiza o clima atual
     */
    renderCurrentWeather(current) {
        const tempElement = document.getElementById('weather-temp');
        const conditionElement = document.getElementById('weather-condition');
        const iconElement = document.getElementById('weather-icon');

        if (tempElement) {
            tempElement.textContent = `${Math.round(current.temp_c)}°C`;
        }

        if (conditionElement) {
            conditionElement.textContent = current.condition.text;
        }

        if (iconElement) {
            iconElement.src = `https:${current.condition.icon}`;
            iconElement.alt = current.condition.text;
        }
    }

    /**
     * Renderiza a previsão dos próximos dias
     */
    renderForecast(forecastDays) {
        const forecastContainer = document.getElementById('forecast-container');
        if (!forecastContainer) return;

        forecastContainer.innerHTML = forecastDays.map(day => {
            const date = new Date(day.date + 'T00:00:00');
            const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3);
            const dayNameCapitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);

            return `
                <div class="flex flex-col items-center space-y-1">
                    <p class="font-semibold text-sm">${dayNameCapitalized}</p>
                    <img src="https:${day.day.condition.icon}" 
                         alt="${day.day.condition.text}"
                         class="w-8 h-8">
                    <p class="text-sm">
                        <span class="font-bold">${Math.round(day.day.maxtemp_c)}°</span>
                        <span>${Math.round(day.day.mintemp_c)}°</span>
                    </p>
                </div>
            `;
        }).join('');
    }

    /**
     * Inicializa o toggle para expandir/recolher a previsão
     */
    initWeatherToggle() {
        const weatherSection = document.getElementById('weather-section');
        const forecastContainer = document.getElementById('forecast-container');
        const weatherChevron = document.getElementById('weather-chevron');

        if (!weatherSection || !forecastContainer || !weatherChevron) {
            console.warn('[WeatherManager] Elementos de toggle não encontrados');
            return;
        }

        weatherSection.addEventListener('click', () => {
            forecastContainer.classList.toggle('hidden');
            weatherChevron.classList.toggle('rotate-180');
        });
    }

    /**
     * Exibe mensagem de erro
     */
    showError() {
        const conditionElement = document.getElementById('weather-condition');
        const tempElement = document.getElementById('weather-temp');
        const forecastContainer = document.getElementById('forecast-container');

        if (conditionElement) {
            conditionElement.textContent = 'Erro ao carregar clima';
        }

        if (tempElement) {
            tempElement.textContent = '--°C';
        }

        if (forecastContainer) {
            forecastContainer.innerHTML = '<p class="text-sm text-red-500 w-full">Não foi possível carregar a previsão.</p>';
        }
    }

    /**
     * Atualiza os dados meteorológicos
     */
    async refresh() {
        console.log('[WeatherManager] Atualizando dados...');
        await this.loadWeatherData();
    }

    /**
     * Obtém a temperatura atual
     */
    getCurrentTemperature() {
        const tempElement = document.getElementById('weather-temp');
        return tempElement ? tempElement.textContent : null;
    }

    /**
     * Obtém a condição climática atual
     */
    getCurrentCondition() {
        const conditionElement = document.getElementById('weather-condition');
        return conditionElement ? conditionElement.textContent : null;
    }
}