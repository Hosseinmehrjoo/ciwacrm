<?php

if (!defined('sugarEntry')) {
    define('sugarEntry', true);
}

chdir('/var/www/html');
require 'include/entryPoint.php';

$clientId = getenv('CIWA_CLIENT_ID') ?: '';
$secret = getenv('CIWA_CLIENT_SECRET') ?: '';
$redirect = getenv('CIWA_PUBLIC_URL') ?: 'http://localhost:8443';

if ($clientId === '' || $secret === '') {
    fwrite(STDERR, "CIWA_CLIENT_ID and CIWA_CLIENT_SECRET are required\n");
    exit(1);
}

$existing = BeanFactory::getBean('OAuth2Clients', $clientId);
if (!empty($existing->id)) {
    fwrite(STDOUT, "oauth client already present\n");
    exit(0);
}

$client = BeanFactory::newBean('OAuth2Clients');
$client->new_with_id = true;
$client->id = $clientId;
$client->name = 'CIWA';
$client->redirect_url = $redirect;
$client->is_confidential = 1;
$client->allowed_grant_type = 'password';
$_REQUEST['new_secret'] = $secret;
$client->save(false);

fwrite(STDOUT, "oauth client created\n");
