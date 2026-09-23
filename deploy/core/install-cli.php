<?php

if (php_sapi_name() !== 'cli') {
    fwrite(STDERR, "CLI only\n");
    exit(1);
}

$root = '/var/www/html';
chdir($root);

$config = [
    'setup_db_host_name' => getenv('CIWA_DB_HOST') ?: 'db',
    'setup_db_database_name' => getenv('CIWA_DB_NAME') ?: 'ciwa',
    'setup_db_port_num' => '3306',
    'setup_db_type' => 'mysql',
    'setup_db_create_database' => 0,
    'setup_db_create_sugarsales_user' => 0,
    'setup_db_drop_tables' => 0,
    'setup_db_sugarsales_user' => getenv('CIWA_DB_USER') ?: 'ciwa',
    'setup_db_sugarsales_password' => getenv('CIWA_DB_PASSWORD') ?: '',
    'setup_db_admin_user_name' => getenv('CIWA_DB_USER') ?: 'ciwa',
    'setup_db_admin_password' => getenv('CIWA_DB_PASSWORD') ?: '',
    'setup_site_url' => getenv('CIWA_CORE_PUBLIC_URL') ?: 'http://localhost:8081',
    'setup_site_admin_user_name' => getenv('CIWA_ADMIN_USER') ?: 'admin',
    'setup_site_admin_password' => getenv('CIWA_ADMIN_PASSWORD') ?: '',
    'setup_system_name' => 'CIWA CRM',
    'setup_site_sugarbeet_automatic_checks' => false,
    'demoData' => 'no',
    'default_currency_iso4217' => 'IRR',
    'default_currency_name' => 'Rial',
    'default_currency_significant_digits' => '0',
    'default_currency_symbol' => 'IRR',
    'default_date_format' => 'Y/m/d',
    'default_time_format' => 'H:i',
    'default_decimal_seperator' => '.',
    'default_number_grouping_seperator' => ',',
    'default_export_charset' => 'UTF-8',
    'default_language' => 'en_us',
    'default_locale_name_format' => 'f l',
    'export_delimiter' => ',',
];

file_put_contents(
    $root . '/config_si.php',
    "<?php\n\$sugar_config_si = " . var_export($config, true) . ";\n"
);

$_SERVER['HTTP_HOST'] = 'localhost';
$_SERVER['SERVER_NAME'] = 'localhost';
$_SERVER['SERVER_PORT'] = '80';
$_SERVER['REQUEST_URI'] = '/install.php?goto=SilentInstall&cli=true';
$_SERVER['SERVER_SOFTWARE'] = 'Apache';
$_REQUEST['goto'] = 'SilentInstall';
$_REQUEST['cli'] = true;
$_POST['email_reminder_checked'] = false;

if (!defined('sugarEntry')) {
    define('sugarEntry', true);
}

ob_start();
require $root . '/install.php';
$output = ob_get_clean();

if (!is_file($root . '/config.php')) {
    fwrite(STDERR, $output);
    exit(1);
}

@unlink($root . '/config_si.php');
