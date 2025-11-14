import { supabase } from './supabaseClient.js';

/**
 * Função auxiliar para fazer upload de um arquivo para o Supabase Storage.
 * @param {File} file - O arquivo a ser enviado.
 * @param {number} id_gestor - O ID do gestor (para organizar os arquivos).
 * @param {string} tipo - 'perfil' ou 'galeria', para organizar no bucket.
 * @returns {Promise<string|null>} - A URL pública do arquivo ou null em caso de falha.
 */
async function uploadArquivo(file, id_gestor, tipo) {
    if (!file) return null;

    // Remove caracteres especiais para criar um nome de arquivo seguro
    const nomeArquivoLimpo = file.name.replace(/[^a-zA-Z0-9._-]/g, '');
    const filePath = `barracas/${id_gestor}/${tipo}/${Date.now()}_${nomeArquivoLimpo}`;

    // 
    // IMPORTANTE: Eu presumi que seu bucket se chama 'media'. 
    // Se o nome do seu bucket no Supabase Storage for outro, altere a linha abaixo.
    // 
    const { error: uploadError } = await supabase.storage
        .from('media') // <-- Altere 'media' se o nome do seu bucket for diferente
        .upload(filePath, file);

    if (uploadError) {
        console.error(`Erro ao enviar arquivo (${tipo}):`, uploadError);
        throw new Error(`Falha no upload do arquivo: ${file.name}`);
    }

    // Obter a URL pública do arquivo que acabamos de enviar
    const { data: urlData } = supabase.storage
        .from('media') // <-- Altere 'media' aqui também
        .getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
         console.error('Não foi possível obter a URL pública para:', filePath);
         return null;
    }

    return urlData.publicUrl;
}

/**
 * Função principal que é executada quando o DOM está pronto.
 */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formCadastroBarraca');
    if (!form) {
        console.error('Formulário de cadastro de barraca não encontrado.');
        return;
    }

    const submitButton = form.querySelector('button[type="submit"]');

    // Adiciona o listener para o envio do formulário
    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // Impede o envio padrão do HTML

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Cadastrando...';
        }

        try {
            // --- 1. OBTER O GESTOR LOGADO ---
            
            // Primeiro, pegamos o usuário autenticado no Supabase Auth
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                console.error('Erro ao buscar usuário ou usuário não logado:', authError?.message);
                throw new Error('Você precisa estar logado como gestor para cadastrar uma barraca.');
            }

            // Agora, usamos o ID do usuário (UUID) para encontrar o ID do gestor (BigInt) na tabela 'gestores'
            const { data: gestor, error: gestorError } = await supabase
                .from('gestores')
                .select('id_gestor')
                .eq('id_usuario', user.id)
                .single(); // Esperamos apenas um resultado

            if (gestorError || !gestor) {
                console.error('Erro ao buscar perfil de gestor:', gestorError?.message);
                throw new Error('Não foi possível encontrar um perfil de gestor associado a este usuário.');
            }

            const id_gestor = gestor.id_gestor;

            // --- 2. COLETAR DADOS DO FORMULÁRIO (TEXTO) ---
            const nome_barraca = document.getElementById('nome-barraca').value;
            const localizacao = document.getElementById('endereco').value;
            const descricao = document.getElementById('descricao').value;
            const horario_func = document.getElementById('horario').value;

            // --- 3. LIDAR COM UPLOAD DE ARQUIVOS ---
            
            // Upload da Foto de Perfil
            const fileInputPerfil = document.getElementById('foto-perfil');
            const perfilFile = fileInputPerfil.files[0]; // Pega o primeiro arquivo
            const fotoPerfilUrl = await uploadArquivo(perfilFile, id_gestor, 'perfil');

            // Upload da Galeria de Fotos (Múltiplos arquivos)
            const fileInputGaleria = document.getElementById('galeria-fotos');
            const galeriaFiles = fileInputGaleria.files; // É um FileList

            // Usamos Promise.all para fazer o upload de todos os arquivos da galeria em paralelo
            const uploadPromises = Array.from(galeriaFiles).map(file => 
                uploadArquivo(file, id_gestor, 'galeria')
            );
            
            const galeriaUrls = (await Promise.all(uploadPromises)).filter(url => url !== null); // Filtra uploads que falharam

            // --- 4. MONTAR O OBJETO PARA INSERIR NO BANCO ---
            // Os nomes das chaves (ex: 'nome_barraca') devem ser iguais aos nomes das colunas na sua tabela 'barracas'
            const dadosParaInserir = {
                id_gestor: id_gestor,
                nome_barraca: nome_barraca,
                localizacao: localizacao,
                descricao: descricao,
                horario_func: horario_func,
                foto_perfil: fotoPerfilUrl,    // URL da foto de perfil
                galeria_fotos: galeriaUrls      // Array de URLs (text[])
            };

            // --- 5. INSERIR NA TABELA 'barracas' ---
            const { data: novaBarraca, error: insertError } = await supabase
                .from('barracas')
                .insert(dadosParaInserir)
                .select() // Pede ao Supabase para retornar o registro que acabou de ser criado
                .single();

            if (insertError) {
                console.error('Erro ao inserir barraca no banco:', insertError);
                throw new Error(`Não foi possível salvar a barraca: ${insertError.message}`);
            }

            console.log('Barraca cadastrada com sucesso!', novaBarraca);
            
            // (Opcional) Você pode usar o seu 'showAlert' se ele estiver disponível globalmente
            // showAlert('Sucesso!', 'Barraca cadastrada. Redirecionando...', 'success');
            alert('Barraca cadastrada com sucesso! Redirecionando...');
            
            form.reset();
            
            // Limpa as pré-visualizações das imagens
            const previewPerfil = document.getElementById('preview-perfil');
            const previewGaleria = document.getElementById('preview-galeria');
            if (previewPerfil) previewPerfil.innerHTML = '';
            if (previewGaleria) previewGaleria.innerHTML = '';
            
            // Redireciona para o início do gestor, assim como no seu 'cadastro.js'
            setTimeout(() => {
                window.location.href = '../Telas Gestor/inicioGestor.html';
            }, 1500);

        } catch (error) {
            console.error('[ERRO GERAL NO CADASTRO DA BARRACA]', error);
            // (Opcional) showAlert('Erro!', error.message, 'error');
            alert(`Erro ao cadastrar barraca: ${error.message}`);
        } finally {
            // Reativa o botão, independentemente de sucesso ou falha
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Cadastrar Barraca';
            }
        }
    });
});