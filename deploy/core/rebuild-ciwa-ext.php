<?php
/**
 * Rebuild SuiteCRM extension maps so CIWA login fields become API-visible.
 */
if (php_sapi_name() !== 'cli') {
    fwrite(STDERR, "CLI only\n");
    exit(1);
}

define('sugarEntry', true);
chdir('/var/www/html');
require_once 'include/entryPoint.php';
require_once 'modules/Administration/QuickRepairAndRebuild.php';

$repair = new RepairAndClear();
$repair->repairAndClearAll(
    ['clearAll'],
    [translate('LBL_ALL_MODULES')],
    false,
    true
);

echo "CIWA extensions rebuilt\n";
