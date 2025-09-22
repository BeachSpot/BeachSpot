const btnEditar = document.getElementById("editar-conta");
const campos = document.querySelectorAll("#nome, #email, #senha");
const fotoPerfilInput = document.getElementById("foto-perfil");
const avatarImg = document.getElementById("avatar");

let editando = false;

btnEditar.addEventListener("click", () => {
  editando = !editando;
  campos.forEach(campo => campo.disabled = !editando);
  btnEditar.textContent = editando ? "Salvar alterações" : "Editar conta";
  
  // Se estiver editando, permite clicar na foto para trocar
  if (editando) {
    avatarImg.style.cursor = "pointer";
    avatarImg.title = "Clique para trocar a foto";
  } else {
    avatarImg.style.cursor = "default";
    avatarImg.title = "";
  }
});

// Trocar foto de perfil ao clicar na imagem
avatarImg.addEventListener("click", function() {
  if (editando) {
    fotoPerfilInput.click();
  }
});

fotoPerfilInput.addEventListener("change", function(e) {
  if (e.target.files && e.target.files[0]) {
    const reader = new FileReader();
    
    reader.onload = function(event) {
      avatarImg.src = event.target.result;
      // Opcional: salvar no localStorage para persistência
      localStorage.setItem('fotoPerfilPersonalizada', event.target.result);
    };
    
    reader.readAsDataURL(e.target.files[0]);
  }
});

// Carregar foto salva ao iniciar (opcional)
window.addEventListener('load', function() {
  const fotoSalva = localStorage.getItem('fotoPerfilPersonalizada');
  if (fotoSalva) {
    avatarImg.src = fotoSalva;
  }
});

// Barra de pesquisa (mantida)
const barra = document.getElementById('barraPesquisa');
const input = document.getElementById('buscar');
let isExpanded = false;

barra.addEventListener('mouseenter', () => {
  if (!isExpanded) barra.classList.add('expanded');
});

barra.addEventListener('mouseleave', () => {
  if (!isExpanded) barra.classList.remove('expanded');
});

barra.addEventListener('click', () => {
  isExpanded = true;
  barra.classList.add('expanded');
  input.focus();
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    isExpanded = false;
    barra.classList.remove('expanded');
    input.blur();
  }
});

document.addEventListener('click', (e) => {
  if (!barra.contains(e.target)) {
    isExpanded = false;
    barra.classList.remove('expanded');
  }
});