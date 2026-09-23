<?php
/**
 * Uninstall GPTForm Embed plugin.
 * Removes all plugin options and transients.
 */
if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

// Delete options
delete_option('gptform_embed_domain');
delete_option('gptform_embed_mode');
delete_option('gptform_embed_branding');

// Delete all cached transients
global $wpdb;
$transients = $wpdb->get_col(
    "SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE '_transient_gptform_embed_form_%'"
);
foreach ($transients as $transient) {
    $key = str_replace('_transient_', '', $transient);
    delete_transient($key);
}
