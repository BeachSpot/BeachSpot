import { supabase } from './supabaseClient.js';

console.log('[cadastroBarraca] Script carregado');

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

    // Remove caracteres especiais para criar um nome de arquivo seguro
    const nomeArquivoLimpo = file.name.replace(/[^a-zA-Z0-9._-]/g, '');
    const filePath = `barracas/${id_gestor}/${tipo}/${Date.now()}_${nomeArquivoLimpo}`;

    // IMPORTANTE: Altere 'media' para o nome do seu bucket no Supabase Storage
    // Se você não tem um bucket, crie um chamado 'media' no Supabase Dashboard > Storage
    const BUCKET_NAME = 'media'; // <-- ALTERE AQUI SE NECESSÁRIO

    const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file);

    if (uploadError) {
        console.error(`[uploadArquivo] Erro ao enviar arquivo (${tipo}):`, uploadError);
        
        // Mensagem de erro mais clara
        if (uploadError.message.includes('Bucket not found')) {
            throw new Error(`O bucket "${BUCKET_NAME}" não existe no Supabase Storage. Por favor, crie o bucket primeiro.`);
        }
        
        throw new Error(`Falha no upload do arquivo: ${file.name} - ${uploadError.message}`);
    }

    // Obter a URL pública do arquivo que acabamos de enviar
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
 * Função principal que é executada quando o DOM está pronto.
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('[cadastroBarraca] DOM carregado');

    const form = document.getElementById('formCadastroBarraca');
    if (!form) {
        console.error('[cadastroBarraca] Formulário não encontrado.');
        return;
    }

    const submitButton = form.querySelector('button[type="submit"]');

    // Adiciona o listener para o envio do formulário
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('[cadastroBarraca] Formulário enviado');

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Cadastrando...';
        }

        try {
            // --- 1. OBTER O GESTOR LOGADO ---
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                console.error('[cadastroBarraca] Erro ao buscar usuário:', authError?.message);
                throw new Error('Você precisa estar logado como gestor para cadastrar uma barraca.');
            }

            console.log('[cadastroBarraca] Usuário autenticado:', user.id);

            // Buscar gestor na tabela usuarios
            const { data: gestor, error: gestorError } = await supabase
                .from('usuarios')
                .select('id_usuario')
                .eq('id_usuario', user.id)
                .eq('tipo_conta', 'gestor')
                .single();

            if (gestorError || !gestor) {
                console.error('[cadastroBarraca] Erro ao buscar perfil de gestor:', gestorError?.message);
                throw new Error('Não foi possível encontrar um perfil de gestor associado a este usuário.');
            }

            const id_gestor = gestor.id_usuario;
            console.log('[cadastroBarraca] ID do gestor:', id_gestor);

            // --- 2. COLETAR DADOS DO FORMULÁRIO ---
            // IDs CORRETOS conforme o HTML
            const nome_barraca = document.getElementById('nome-barraca')?.value;
            const endereco = document.getElementById('endereco')?.value;
            const descricao = document.getElementById('descricao')?.value;
            
            // Horários
            const horaAbertura = document.getElementById('hora-abertura')?.value;
            const horaFechamento = document.getElementById('hora-fechamento')?.value;
            const horario_func = horaAbertura && horaFechamento 
                ? `${horaAbertura} - ${horaFechamento}` 
                : '';

            // Dias da semana
            const diasSelecionados = Array.from(document.querySelectorAll('input[name="dias[]"]:checked'))
                .map(input => input.value);

            // Características
            const caracteristicas = Array.from(document.querySelectorAll('input[name="caracteristicas[]"]:checked'))
                .map(input => input.value);

            // Abre em feriados
            const abreFeriados = document.getElementById('abre-feriados')?.checked || false;

            // Link do cardápio
            const linkCardapio = document.getElementById('link-cardapio')?.value || null;

            console.log('[cadastroBarraca] Dados coletados:', {
                nome_barraca,
                endereco,
                horario_func,
                diasSelecionados,
                caracteristicas,
                abreFeriados
            });

            // Validações básicas
            if (!nome_barraca || !endereco || !descricao) {
                throw new Error('Por favor, preencha todos os campos obrigatórios.');
            }

            // --- 3. LIDAR COM UPLOAD DE ARQUIVOS ---
            
            // Imagem de destaque
            const inputDestaque = document.getElementById('imagem-destaque');
            let fotoPerfilUrl = null;
            
            if (inputDestaque && inputDestaque.files && inputDestaque.files.length > 0) {
                console.log('[cadastroBarraca] Fazendo upload da imagem de destaque...');
                fotoPerfilUrl = await uploadArquivo(inputDestaque.files[0], id_gestor, 'perfil');
            }

            // Galeria de fotos
            const inputGaleria = document.getElementById('galeria-fotos');
            let galeriaUrls = [];
            
            if (inputGaleria && inputGaleria.files && inputGaleria.files.length > 0) {
                console.log(`[cadastroBarraca] Fazendo upload de ${inputGaleria.files.length} fotos da galeria...`);
                
                const uploadPromises = Array.from(inputGaleria.files).map(file => 
                    uploadArquivo(file, id_gestor, 'galeria')
                );
                
                galeriaUrls = (await Promise.all(uploadPromises)).filter(url => url !== null);
                console.log(`[cadastroBarraca] ${galeriaUrls.length} fotos da galeria enviadas com sucesso`);
            }

            // --- 4. MONTAR O OBJETO PARA INSERIR NO BANCO ---
            // Enviando arrays diretamente (colunas do tipo text[] no PostgreSQL)
            const dadosParaInserir = {
                id_gestor: id_gestor,
                nome_barraca: nome_barraca,
                descricao_barraca: descricao,
                localizacao: endereco,
                horario_func: horario_func,
                dias_funcionamento: diasSelecionados.length > 0 ? diasSelecionados : [], // Array vazio se não houver dados
                caracteristicas: caracteristicas.length > 0 ? caracteristicas : [], // Array vazio se não houver dados
                abre_feriados: abreFeriados,
                link_cardapio: linkCardapio || null,
                foto_destaque: fotoPerfilUrl || null,
                galeria_urls: galeriaUrls.length > 0 ? galeriaUrls : [] // Array vazio se não houver dados
            };

            console.log('[cadastroBarraca] Dados para inserir:', dadosParaInserir);

            // --- 5. INSERIR NA TABELA 'barracas' ---
            const { data: novaBarraca, error: insertError } = await supabase
                .from('barracas')
                .insert(dadosParaInserir)
                .select()
                .single();

            if (insertError) {
                console.error('[cadastroBarraca] Erro ao inserir barraca:', insertError);
                throw new Error(`Não foi possível salvar a barraca: ${insertError.message}`);
            }

            console.log('[cadastroBarraca] Barraca cadastrada com sucesso!', novaBarraca);
            
            alert('Barraca cadastrada com sucesso! Redirecionando...');
            
            form.reset();
            
            // Limpa as pré-visualizações das imagens
            const previewDestaque = document.getElementById('preview-destaque');
            const previewGaleria = document.getElementById('preview-galeria');
            if (previewDestaque) previewDestaque.innerHTML = '';
            if (previewGaleria) previewGaleria.innerHTML = '';
            
            // Redireciona para o início do gestor
            setTimeout(() => {
                window.location.href = '../Telas Gestor/inicioGestor.html';
            }, 1500);

        } catch (error) {
            console.error('[cadastroBarraca] ERRO GERAL:', error);
            alert(`Erro ao cadastrar barraca: ${error.message}`);
        } finally {
            // Reativa o botão
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Finalizar Cadastro';
            }
        }
    });
});