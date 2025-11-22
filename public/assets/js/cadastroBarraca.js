import { supabase } from './supabaseClient.js';
import { checkAuthentication } from './getUserProfile.js';

console.log('[cadastroBarraca] Script Unificado Carregado');

/**
 * Função auxiliar para fazer upload de um arquivo para o Supabase Storage.
 * @param {File} file - O arquivo a ser enviado.
 * @param {number} id_gestor - O ID do gestor (para organizar os arquivos).
 * @param {string} tipo - 'perfil' ou 'galeria', para organizar no bucket.
 * @returns {Promise<string|null>} - A URL pública do arquivo ou null em caso de falha.
 */
async function uploadArquivo(file, id_gestor, tipo) {
    if (!file) return null;

    console.log(`[uploadArquivo] Iniciando upload: ${file.name}, tipo: ${tipo}`);

    const nomeArquivoLimpo = file.name.replace(/[^a-zA-Z0-9._-]/g, '');
    const filePath = `barracas/${id_gestor}/${tipo}/${Date.now()}_${nomeArquivoLimpo}`;

    const BUCKET_NAME = 'media';

    const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file);

    if (uploadError) {
        console.error(`[uploadArquivo] Erro ao enviar arquivo (${tipo}):`, uploadError);
        
        if (uploadError.message.includes('Bucket not found')) {
            throw new Error(`O bucket "${BUCKET_NAME}" não existe no Supabase Storage. Por favor, crie o bucket primeiro.`);
        }
        
        throw new Error(`Falha no upload do arquivo: ${file.name} - ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
        console.error('[uploadArquivo] Não foi possível obter a URL pública para:', filePath);
        return null;
    }

    console.log(`[uploadArquivo] Upload concluído: ${urlData.publicUrl}`);
    return urlData.publicUrl;
}

/**
 * Classe para gerenciar o cadastro/edição de barraca
 */
class CadastroBarracaManager {
    constructor() {
        this.idGestor = null;
        this.idBarraca = null;
        this.isEditMode = false;
        this.barracaData = null;
        
        this.initElements();
        this.init();
    }

    initElements() {
        this.form = document.getElementById('formCadastroBarraca');
        this.submitButton = this.form?.querySelector('button[type="submit"]');
        this.pageTitle = document.querySelector('section h1');
        this.pageSubtitle = document.querySelector('section p');
        
        this.nomeInput = document.getElementById('nome-barraca');
        this.enderecoInput = document.getElementById('endereco');
        this.descricaoInput = document.getElementById('descricao');
        this.precoMedioInput = document.getElementById('preco-medio');
        this.capacidadeMesasInput = document.getElementById('capacidade-mesas');
        this.horaAberturaInput = document.getElementById('hora-abertura');
        this.horaFechamentoInput = document.getElementById('hora-fechamento');
        this.abreFeriadosInput = document.getElementById('abre-feriados');
        this.imagemDestaqueInput = document.getElementById('imagem-destaque');
        this.galeriaFotosInput = document.getElementById('galeria-fotos');
        
        this.previewDestaque = document.getElementById('preview-destaque');
        this.previewGaleria = document.getElementById('preview-galeria');
    }

    async init() {
        try {
            console.log('[CadastroBarraca] Inicializando...');

            const isAuthenticated = await checkAuthentication();
            if (!isAuthenticated) {
                window.location.href = '../entrar.html';
                return;
            }

            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError || !session || !session.user) {
                console.error('[CadastroBarraca] Erro ao obter sessão:', sessionError);
                window.location.href = '../entrar.html';
                return;
            }

            this.idGestor = session.user.id;
            console.log('[CadastroBarraca] Gestor autenticado:', this.idGestor);

            const urlParams = new URLSearchParams(window.location.search);
            const barracaId = urlParams.get('id');

            if (barracaId) {
                console.log('[CadastroBarraca] Modo de edição - ID:', barracaId);
                this.idBarraca = barracaId;
                this.isEditMode = true;
                await this.loadBarracaData();
            } else {
                console.log('[CadastroBarraca] Modo de criação');
                this.isEditMode = false;
            }

            console.log('[CadastroBarraca] Configurando event listeners...');
            this.setupEventListeners();
            console.log('[CadastroBarraca] Inicialização concluída com sucesso!');

        } catch (error) {
            console.error('[CadastroBarraca] Erro na inicialização:', error);
            alert(`Erro ao inicializar: ${error.message}`);
        }
    }

    async loadBarracaData() {
        try {
            console.log('[CadastroBarraca] Carregando dados da barraca...');

            const { data: barraca, error } = await supabase
                .from('barracas')
                .select('*')
                .eq('id_barraca', this.idBarraca)
                .eq('id_gestor', this.idGestor)
                .single();

            if (error) throw error;

            if (!barraca) {
                throw new Error('Barraca não encontrada ou você não tem permissão para editá-la.');
            }

            this.barracaData = barraca;
            console.log('[CadastroBarraca] Dados carregados:', barraca);

            this.fillForm();
            this.updateUIForEditMode();

        } catch (error) {
            console.error('[CadastroBarraca] Erro ao carregar barraca:', error);
            alert('Erro ao carregar dados da barraca.');
            window.location.href = './inicioGestor.html';
        }
    }

    fillForm() {
        if (!this.barracaData) return;

        const data = this.barracaData;

        if (this.nomeInput) this.nomeInput.value = data.nome_barraca || '';
        if (this.enderecoInput) this.enderecoInput.value = data.localizacao || '';
        if (this.descricaoInput) this.descricaoInput.value = data.descricao_barraca || '';
        if (this.precoMedioInput) this.precoMedioInput.value = data.preco_medio || '';
        if (this.capacidadeMesasInput) this.capacidadeMesasInput.value = data.capacidade_mesas || '';
        if (this.abreFeriadosInput) this.abreFeriadosInput.checked = data.abre_feriados || false;

        const latitudeInput = document.getElementById('latitude');
        const longitudeInput = document.getElementById('longitude');
        if (latitudeInput && data.latitude) latitudeInput.value = data.latitude;
        if (longitudeInput && data.longitude) longitudeInput.value = data.longitude;

        if (data.latitude && data.longitude) {
            const coordenadasInfo = document.getElementById('coordenadas-info');
            const coordsDisplay = document.getElementById('coords-display');
            if (coordenadasInfo && coordsDisplay) {
                coordenadasInfo.classList.remove('hidden');
                coordsDisplay.textContent = `${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`;
            }
        }

        if (data.horario_func && data.horario_func.includes('-')) {
            const [abertura, fechamento] = data.horario_func.split('-').map(h => h.trim());
            if (this.horaAberturaInput) this.horaAberturaInput.value = abertura;
            if (this.horaFechamentoInput) this.horaFechamentoInput.value = fechamento;
        }

        if (data.dias_funcionamento && Array.isArray(data.dias_funcionamento)) {
            data.dias_funcionamento.forEach(dia => {
                const checkbox = document.querySelector(`input[name="dias[]"][value="${dia}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }

        if (data.caracteristicas && Array.isArray(data.caracteristicas)) {
            data.caracteristicas.forEach(carac => {
                const checkbox = document.querySelector(`input[name="caracteristicas[]"][value="${carac}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }

        if (data.foto_destaque && this.previewDestaque) {
            this.previewDestaque.innerHTML = `
                <div class="relative inline-block">
                    <img src="${data.foto_destaque}" class="w-32 h-32 object-cover rounded-lg border-2 border-gray-300">
                    <p class="text-sm text-gray-500 mt-1">Imagem atual</p>
                    <p class="text-xs text-blue-600 mt-1">💡 Selecione nova imagem para substituir</p>
                </div>
            `;
        }

        if (data.galeria_urls && Array.isArray(data.galeria_urls) && data.galeria_urls.length > 0 && this.previewGaleria) {
            this.previewGaleria.innerHTML = data.galeria_urls.map((url, index) => `
                <div class="relative">
                    <img src="${url}" class="w-24 h-24 object-cover rounded-lg border-2 border-gray-300">
                    <button type="button" onclick="window.removeGalleryImage(${index})" 
                        class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition">
                        ×
                    </button>
                </div>
            `).join('') + `
                <div class="col-span-full">
                    <p class="text-xs text-blue-600">💡 Selecione novas imagens para adicionar ou clique no X para remover</p>
                </div>
            `;
            
            window.removeGalleryImage = (index) => {
                if (confirm('Deseja remover esta imagem da galeria?')) {
                    this.barracaData.galeria_urls.splice(index, 1);
                    this.fillForm();
                }
            };
        }

        console.log('[CadastroBarraca] Formulário preenchido com sucesso');
    }

    updateUIForEditMode() {
        if (this.pageTitle) {
            this.pageTitle.textContent = 'Editar Barraca';
        }
        
        if (this.pageSubtitle) {
            this.pageSubtitle.textContent = `Atualize as informações da sua barraca ${this.barracaData?.nome_barraca || ''}`;
        }
        
        if (this.submitButton) {
            this.submitButton.textContent = 'Salvar Alterações';
        }
    }

    setupEventListeners() {
        if (!this.form) {
            console.error('[CadastroBarraca] Formulário não encontrado.');
            return;
        }

        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        this.initMapSelection();

        if (this.imagemDestaqueInput) {
            this.imagemDestaqueInput.addEventListener('change', (e) => this.previewImagemDestaque(e));
        }

        if (this.galeriaFotosInput) {
            this.galeriaFotosInput.addEventListener('change', (e) => this.previewGaleriaFotos(e));
        }
    }

    initMapSelection() {
        const marcarNoMapaBtn = document.getElementById('marcar-no-mapa-btn');
        const mapModal = document.getElementById('map-modal');
        const mapModalClose = document.getElementById('map-modal-close');
        const cancelLocationBtn = document.getElementById('cancel-location-btn');
        const confirmLocationBtn = document.getElementById('confirm-location-btn');
        const coordenadasInfo = document.getElementById('coordenadas-info');
        const coordsDisplay = document.getElementById('coords-display');
        const selectedCoordsText = document.getElementById('selected-coords');
        
        const latitudeInput = document.getElementById('latitude');
        const longitudeInput = document.getElementById('longitude');

        let locationMap = null;
        let currentMarker = null;
        let selectedCoords = null;

        const defaultCoords = { lng: -38.5108, lat: -12.9714 };

        if (marcarNoMapaBtn) {
            marcarNoMapaBtn.addEventListener('click', () => {
                mapModal.classList.remove('hidden');
                document.body.style.overflow = 'hidden';

                if (!locationMap) {
                    const apiKey = 'fQkLRhuKNXOuJ7C7hE32';

                    const initialCoords = (latitudeInput.value && longitudeInput.value)
                        ? { lng: parseFloat(longitudeInput.value), lat: parseFloat(latitudeInput.value) }
                        : defaultCoords;

                    locationMap = new maplibregl.Map({
                        container: 'location-map',
                        style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${apiKey}`,
                        center: [initialCoords.lng, initialCoords.lat],
                        zoom: 13
                    });

                    locationMap.addControl(new maplibregl.NavigationControl(), 'top-right');

                    locationMap.on('load', () => {
                        if (latitudeInput.value && longitudeInput.value) {
                            selectedCoords = initialCoords;
                            addMarker(selectedCoords);
                            updateCoordsDisplay(selectedCoords);
                            confirmLocationBtn.disabled = false;
                        }

                        locationMap.on('click', (e) => {
                            selectedCoords = {
                                lng: e.lngLat.lng,
                                lat: e.lngLat.lat
                            };

                            addMarker(selectedCoords);
                            updateCoordsDisplay(selectedCoords);
                            confirmLocationBtn.disabled = false;
                        });
                    });
                } else {
                    setTimeout(() => locationMap.resize(), 100);
                }
            });
        }

        const addMarker = (coords) => {
            if (currentMarker) {
                currentMarker.remove();
            }

            currentMarker = new maplibregl.Marker({ 
                color: "#0138b4",
                scale: 1.2,
                draggable: true 
            })
                .setLngLat([coords.lng, coords.lat])
                .setPopup(
                    new maplibregl.Popup({ offset: 25 })
                        .setHTML(`
                            <div class="text-center p-2">
                                <p class="font-bold text-gray-800">Localização da Barraca</p>
                                <p class="text-xs text-gray-600 mt-1">
                                    Lat: ${coords.lat.toFixed(6)}<br>
                                    Lng: ${coords.lng.toFixed(6)}
                                </p>
                            </div>
                        `)
                )
                .addTo(locationMap);

            currentMarker.on('dragend', () => {
                const lngLat = currentMarker.getLngLat();
                selectedCoords = {
                    lng: lngLat.lng,
                    lat: lngLat.lat
                };
                updateCoordsDisplay(selectedCoords);
            });

            locationMap.flyTo({
                center: [coords.lng, coords.lat],
                zoom: 15
            });
        };

        const updateCoordsDisplay = (coords) => {
            if (selectedCoordsText) {
                selectedCoordsText.innerHTML = `
                    <i data-lucide="map-pin" class="w-4 h-4 inline text-blue-600"></i>
                    Lat: ${coords.lat.toFixed(6)}, Lng: ${coords.lng.toFixed(6)}
                `;
                lucide.createIcons();
            }
        };

        const closeMapModal = () => {
            mapModal.classList.add('hidden');
            document.body.style.overflow = '';
        };

        if (mapModalClose) {
            mapModalClose.addEventListener('click', closeMapModal);
        }

        if (cancelLocationBtn) {
            cancelLocationBtn.addEventListener('click', closeMapModal);
        }

        if (confirmLocationBtn) {
            confirmLocationBtn.addEventListener('click', () => {
                if (selectedCoords) {
                    if (latitudeInput) latitudeInput.value = selectedCoords.lat.toFixed(8);
                    if (longitudeInput) longitudeInput.value = selectedCoords.lng.toFixed(8);

                    if (coordenadasInfo) coordenadasInfo.classList.remove('hidden');
                    if (coordsDisplay) coordsDisplay.textContent = `${selectedCoords.lat.toFixed(6)}, ${selectedCoords.lng.toFixed(6)}`;
                    
                    if (typeof lucide !== 'undefined') {
                        lucide.createIcons();
                    }

                    closeMapModal();

                    alert('✅ Localização marcada com sucesso!');
                }
            });
        }

        if (mapModal) {
            mapModal.addEventListener('click', (e) => {
                if (e.target === mapModal) {
                    closeMapModal();
                }
            });
        }
    }

    previewImagemDestaque(e) {
        const file = e.target.files[0];
        if (!file || !this.previewDestaque) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            this.previewDestaque.innerHTML = `
                <div class="relative">
                    <img src="${event.target.result}" class="w-32 h-32 object-cover rounded-lg border-2 border-blue-500">
                    <p class="text-sm text-blue-600 mt-1">📸 Nova imagem selecionada</p>
                    <p class="text-xs text-gray-500">${file.name}</p>
                </div>
            `;
        };
        reader.readAsDataURL(file);
    }

    previewGaleriaFotos(e) {
        if (!this.previewGaleria) return;

        const existingImages = this.isEditMode && this.barracaData?.galeria_urls 
            ? this.barracaData.galeria_urls.map((url, index) => `
                <div class="relative">
                    <img src="${url}" class="w-24 h-24 object-cover rounded-lg border-2 border-gray-300">
                    <button type="button" onclick="window.removeGalleryImage(${index})" 
                        class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition">
                        ×
                    </button>
                </div>
            `).join('')
            : '';
        
        const newImages = Array.from(e.target.files).map(file => {
            const reader = new FileReader();
            return new Promise((resolve) => {
                reader.onload = (event) => {
                    resolve(`
                        <div class="relative">
                            <img src="${event.target.result}" class="w-24 h-24 object-cover rounded-lg border-2 border-blue-500">
                            <p class="text-xs text-blue-600 text-center mt-1">Nova</p>
                        </div>
                    `);
                };
                reader.readAsDataURL(file);
            });
        });

        Promise.all(newImages).then(images => {
            this.previewGaleria.innerHTML = existingImages + images.join('') + `
                <div class="col-span-full">
                    <p class="text-xs text-blue-600">💡 ${images.length} nova(s) imagem(ns) será(ão) adicionada(s)</p>
                </div>
            `;
        });
    }

    async handleSubmit(e) {
        e.preventDefault();
        console.log('[CadastroBarraca] Formulário enviado');

        if (this.submitButton) {
            this.submitButton.disabled = true;
            this.submitButton.textContent = this.isEditMode ? 'Salvando...' : 'Cadastrando...';
        }

        try {
            const nome_barraca = this.nomeInput?.value;
            const endereco = this.enderecoInput?.value;
            const descricao = this.descricaoInput?.value;
            const precoMedio = this.precoMedioInput?.value;
            const preco_medio = precoMedio ? parseFloat(precoMedio) : null;
            const capacidadeMesas = this.capacidadeMesasInput?.value;
            const capacidade_mesas = capacidadeMesas ? parseInt(capacidadeMesas) : null;

            const latitudeInput = document.getElementById('latitude');
            const longitudeInput = document.getElementById('longitude');
            
            const latitude = latitudeInput?.value ? parseFloat(latitudeInput.value) : null;
            const longitude = longitudeInput?.value ? parseFloat(longitudeInput.value) : null;

            if (!latitude || !longitude) {
                alert('Por favor, marque a localização exata da barraca no mapa.');
                if (this.submitButton) {
                    this.submitButton.disabled = false;
                    this.submitButton.textContent = this.isEditMode ? 'Salvar Alterações' : 'Finalizar Cadastro';
                }
                return;
            }

            const horaAbertura = this.horaAberturaInput?.value;
            const horaFechamento = this.horaFechamentoInput?.value;
            const horario_func = horaAbertura && horaFechamento 
                ? `${horaAbertura} - ${horaFechamento}` 
                : '';

            const diasSelecionados = Array.from(document.querySelectorAll('input[name="dias[]"]:checked'))
                .map(input => input.value);

            const caracteristicas = Array.from(document.querySelectorAll('input[name="caracteristicas[]"]:checked'))
                .map(input => input.value);

            const abreFeriados = this.abreFeriadosInput?.checked || false;

            console.log('[CadastroBarraca] Dados coletados:', {
                nome_barraca,
                endereco,
                latitude,
                longitude,
                horario_func,
                diasSelecionados,
                caracteristicas,
                abreFeriados
            });

            if (!nome_barraca || !endereco || !descricao) {
                throw new Error('Por favor, preencha todos os campos obrigatórios.');
            }

            let fotoPerfilUrl = this.barracaData?.foto_destaque || null;
            let galeriaUrls = this.barracaData?.galeria_urls || [];

            if (this.imagemDestaqueInput?.files && this.imagemDestaqueInput.files.length > 0) {
                console.log('[CadastroBarraca] Fazendo upload da nova imagem de destaque...');
                const novaFotoDestaque = await uploadArquivo(this.imagemDestaqueInput.files[0], this.idGestor, 'perfil');
                if (novaFotoDestaque) {
                    fotoPerfilUrl = novaFotoDestaque;
                    console.log('[CadastroBarraca] ✅ Imagem de destaque substituída');
                }
            }

            if (this.galeriaFotosInput?.files && this.galeriaFotosInput.files.length > 0) {
                console.log(`[CadastroBarraca] Fazendo upload de ${this.galeriaFotosInput.files.length} novas fotos da galeria...`);
                
                const uploadPromises = Array.from(this.galeriaFotosInput.files).map(file => 
                    uploadArquivo(file, this.idGestor, 'galeria')
                );
                
                const novasUrls = (await Promise.all(uploadPromises)).filter(url => url !== null);
                
                galeriaUrls = [...galeriaUrls, ...novasUrls];
                
                console.log(`[CadastroBarraca] ✅ ${novasUrls.length} fotos adicionadas à galeria`);
            }

            const dadosBarraca = {
                nome_barraca: nome_barraca,
                descricao_barraca: descricao,
                localizacao: endereco,
                latitude: latitude,
                longitude: longitude,
                preco_medio: preco_medio,
                capacidade_mesas: capacidade_mesas,
                horario_func: horario_func,
                dias_funcionamento: diasSelecionados.length > 0 ? diasSelecionados : [],
                caracteristicas: caracteristicas.length > 0 ? caracteristicas : [],
                abre_feriados: abreFeriados,
                foto_destaque: fotoPerfilUrl || null,
                galeria_urls: galeriaUrls.length > 0 ? galeriaUrls : []
            };

            if (!this.isEditMode) {
                dadosBarraca.id_gestor = this.idGestor;
            }

            console.log('[CadastroBarraca] Dados para salvar:', dadosBarraca);

            let barracaId = this.idBarraca;
            
            if (this.isEditMode) {
                const { data: barracaAtualizada, error: updateError } = await supabase
                    .from('barracas')
                    .update(dadosBarraca)
                    .eq('id_barraca', this.idBarraca)
                    .eq('id_gestor', this.idGestor)
                    .select()
                    .single();

                if (updateError) {
                    console.error('[CadastroBarraca] Erro ao atualizar barraca:', updateError);
                    throw new Error(`Não foi possível atualizar a barraca: ${updateError.message}`);
                }

                console.log('[CadastroBarraca] Barraca atualizada com sucesso!', barracaAtualizada);
                alert('Barraca atualizada com sucesso!');

            } else {
                const { data: novaBarraca, error: insertError } = await supabase
                    .from('barracas')
                    .insert(dadosBarraca)
                    .select()
                    .single();

                if (insertError) {
                    console.error('[CadastroBarraca] Erro ao inserir barraca:', insertError);
                    throw new Error(`Não foi possível salvar a barraca: ${insertError.message}`);
                }

                console.log('[CadastroBarraca] Barraca cadastrada com sucesso!', novaBarraca);
                alert('Barraca cadastrada com sucesso! Redirecionando...');
                
                barracaId = novaBarraca.id_barraca;
                
                this.form.reset();
                
                if (this.previewDestaque) this.previewDestaque.innerHTML = '';
                if (this.previewGaleria) this.previewGaleria.innerHTML = '';
            }

            setTimeout(() => {
                const urlParams = new URLSearchParams(window.location.search);
                const origem = urlParams.get('origem');
                
                if (origem === 'gestao' && barracaId) {
                    window.location.href = `gestaoBarraca.html?id=${barracaId}`;
                } else {
                    window.location.href = './inicioGestor.html';
                }
            }, 1500);

        } catch (error) {
            console.error('[CadastroBarraca] ERRO GERAL:', error);
            alert(`Erro ao ${this.isEditMode ? 'atualizar' : 'cadastrar'} barraca: ${error.message}`);
        } finally {
            if (this.submitButton) {
                this.submitButton.disabled = false;
                this.submitButton.textContent = this.isEditMode ? 'Salvar Alterações' : 'Finalizar Cadastro';
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('[cadastroBarraca] DOM carregado');
    new CadastroBarracaManager();
});