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
        // Removido: this.initWeatherToggle();
    }

    /**
     * Busca dados meteorológicos da API
     */
    async loadWeatherData() {
        const url = `https://api.weatherapi.com/v1/current.json?key=${this.apiKey}&q=${this.coords.lat},${this.coords.lng}&lang=pt`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Falha na API do tempo');

            const data = await response.json();
            
            this.renderCurrentWeather(data.current);

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
     * Exibe mensagem de erro
     */
    showError() {
        const conditionElement = document.getElementById('weather-condition');
        const tempElement = document.getElementById('weather-temp');

        if (conditionElement) {
            conditionElement.textContent = 'Erro ao carregar clima';
        }

        if (tempElement) {
            tempElement.textContent = '--°C';
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