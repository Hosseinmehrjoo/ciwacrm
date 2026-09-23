<?php

$directory = '/var/www/html/Api/V8/OAuth2';
$privatePath = $directory . '/private.key';
$publicPath = $directory . '/public.key';

if (is_file($privatePath) && is_file($publicPath) && filesize($privatePath) > 0) {
    chmod($privatePath, 0600);
    chmod($publicPath, 0600);
    fwrite(STDOUT, "oauth keys already present\n");
    exit(0);
}

$key = openssl_pkey_new([
    'private_key_bits' => 2048,
    'private_key_type' => OPENSSL_KEYTYPE_RSA,
]);
if ($key === false) {
    fwrite(STDERR, "unable to generate oauth key\n");
    exit(1);
}

openssl_pkey_export($key, $private);
$details = openssl_pkey_get_details($key);
file_put_contents($privatePath, $private);
file_put_contents($publicPath, $details['key']);
chmod($privatePath, 0600);
chmod($publicPath, 0600);
fwrite(STDOUT, "oauth keys created\n");
