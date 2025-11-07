/**
 * @param {Object} supabase - Cliente Supabase inicializado (do supabaseClient.js)
 * @param {Object} dadosDaBarraca - Dados da barraca a ser cadastrada
 * @param {number} dadosDaBarraca.id_gestor - ID do gestor responsável pela barraca
 * @param {string} dadosDaBarraca.nome_barraca - Nome da barraca (máx. 30 caracteres)
 * @param {string} dadosDaBarraca.descricao_barraca - Descrição detalhada da barraca
 * @param {string} [dadosDaBarraca.localizacao] - Localização da barraca (opcional, máx. 30 caracteres)
 * @returns {Promise<Object|null>} Retorna o registro completo da barraca criada ou null em caso de erro
 */
async function cadastrarBarraca(supabase, dadosDaBarraca) {
  try {
    // Validação básica dos campos obrigatórios
    if (!dadosDaBarraca.id_gestor) {
      console.error('Erro: id_gestor é obrigatório');
      return null;
    }

    if (!dadosDaBarraca.nome_barraca || dadosDaBarraca.nome_barraca.trim() === '') {
      console.error('Erro: nome_barraca é obrigatório');
      return null;
    }

    if (!dadosDaBarraca.descricao_barraca || dadosDaBarraca.descricao_barraca.trim() === '') {
      console.error('Erro: descricao_barraca é obrigatório');
      return null;
    }

    // Prepara o objeto para inserção
    const novaBarraca = {
      id_gestor: dadosDaBarraca.id_gestor,
      nome_barraca: dadosDaBarraca.nome_barraca.trim(),
      descricao_barraca: dadosDaBarraca.descricao_barraca.trim(),
      localizacao: dadosDaBarraca.localizacao ? dadosDaBarraca.localizacao.trim() : null
    };

    // Insere a barraca no banco de dados e retorna o registro completo
    const { data, error } = await supabase
      .from('barracas')
      .insert(novaBarraca)
      .select()
      .single();

    // Verifica se houve erro na operação
    if (error) {
      console.error('Erro ao cadastrar barraca:', error.message);
      console.error('Detalhes do erro:', error);
      return null;
    }

    // Retorna o registro completo da barraca recém-criada
    console.log('Barraca cadastrada com sucesso:', data);
    return data;

  } catch (error) {
    // Trata erros inesperados
    console.error('Erro inesperado ao cadastrar barraca:', error);
    return null;
  }
}

// ============================================
// EXEMPLO DE USO NO FORMULÁRIO
// ============================================

// Importe o cliente Supabase (já configurado em supabaseClient.js)
// import { supabase } from './supabaseClient.js';

// Exemplo de uso ao submeter o formulário:
/*
document.querySelector('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Pega o id_gestor do usuário logado (você precisa armazenar isso no login)
  const id_gestor = localStorage.getItem('id_usuario'); // ou sessionStorage
  
  // Coleta os dados do formulário
  const dadosDaBarraca = {
    id_gestor: parseInt(id_gestor),
    nome_barraca: document.getElementById('nome-barraca').value,
    descricao_barraca: document.getElementById('descricao').value,
    localizacao: document.getElementById('endereco').value
  };
  
  // Chama a função para cadastrar
  const barracaCadastrada = await cadastrarBarraca(supabase, dadosDaBarraca);
  
  if (barracaCadastrada) {
    alert('Barraca cadastrada com sucesso!');
    console.log('Dados da barraca:', barracaCadastrada);
    // Redireciona para a página de gestão
    window.location.href = 'gestaoBarraca.html';
  } else {
    alert('Erro ao cadastrar barraca. Verifique o console para mais detalhes.');
  }
});
*/