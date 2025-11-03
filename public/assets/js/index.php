<?php

// Variáveis para o redirecionamento
$redirect_url = "index.html#contato"; // Volta para a âncora de contato
$status_param = "";

// 1. Verifica se o método de requisição é POST
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    // 2. Coleta e sanitiza os dados do formulário
    // filter_input é mais seguro que usar $_POST diretamente
    $nome = filter_input(INPUT_POST, 'nome', FILTER_SANITIZE_STRING);
    $email = filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL);
    $assunto = filter_input(INPUT_POST, 'assunto', FILTER_SANITIZE_STRING);
    $mensagem = filter_input(INPUT_POST, 'mensagem', FILTER_SANITIZE_STRING);

    // 3. Valida os dados
    if (empty($nome) || empty($email) || empty($assunto) || empty($mensagem)) {
        // Erro: Campos vazios
        $status_param = "?status=erro_campos";
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        // Erro: E-mail inválido
        $status_param = "?status=erro_email";
    } else {
        // 4. Prepara o e-mail para envio
        $destinatario = "beachspot.site@gmail.com";
        $assunto_email = "Contato (BeachSpot): $assunto";
        
        $corpo_email = "Você recebeu uma nova mensagem do formulário de contato do site.\n\n";
        $corpo_email .= "Nome: $nome\n";
        $corpo_email .= "E-mail: $email\n";
        $corpo_email .= "Assunto: $assunto\n\n";
        $corpo_email .= "Mensagem:\n$mensagem\n";
        
        // Cabeçalhos (Headers)
        $headers = "From: $nome <$email>\r\n";
        $headers .= "Reply-To: $email\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion();

        // 5. Tenta enviar o e-mail
        if (mail($destinatario, $assunto_email, $corpo_email, $headers)) {
            // Sucesso
            $status_param = "?status=sucesso";
        } else {
            // Erro no servidor
            $status_param = "?status=erro_envio";
        }
    }
} else {
    // Se alguém tentar acessar o index.php diretamente, apenas redireciona
    $status_param = "";
}

// 6. Redireciona o usuário de volta para o index.html com o status
header("Location: " . $redirect_url . $status_param);
exit();

?>