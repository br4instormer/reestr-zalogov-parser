<?php

//$page_body = file_get_contents("https://get_request?key=asd1234asd&provider=zalog");
$page_body = "wanted-fsin===3543797|Зиновьев Вадим Михайлович|24.07.1969";
//$page_body = "wanted-fsin===12345|Петров Петр Иванович|01.11.1985";
if ($page_body == 'No access' || $page_body == 'None') {
    echo json_encode(['error' => $page_body]); // Вернуть ошибку в формате JSON
    exit();
}
$info = explode('===', $page_body);
if (!isset($info[1])) {
    echo json_encode(['error' => 'Checklic server isn\'t connected.']); // Вернуть ошибку в формате JSON
    exit;
}

$info = explode('|', $info[1]);

echo json_encode([
    'id' => $info[0],
    'FullName' => $info[1],
    'Data' => $info[2]
]);
