/**
 * BGOS AI Chatbot Admin Script
 */
(function($) {
    'use strict';

    $(document).ready(function() {
        // Tab switching
        $('.bgos-nav-tabs .nav-tab').on('click', function(e) {
            e.preventDefault();
            var targetTab = $(this).data('tab');

            $('.bgos-nav-tabs .nav-tab').removeClass('nav-tab-active');
            $(this).addClass('nav-tab-active');

            $('.bgos-tab-content').removeClass('bgos-tab-active');
            $('#' + targetTab).addClass('bgos-tab-active');
        });

        // Test Connection Button
        $('#bgos_btn_test_connection').on('click', function() {
            var $btn = $(this);
            var $result = $('#bgos_connection_result');
            var agentId = $('#bgos_agent_id').val();
            var serverUrl = $('#bgos_server_url').val();

            $btn.prop('disabled', true).text('Checking...');
            $result.removeClass('success error').text(bgosAdmin.testing);

            $.post(bgosAdmin.ajaxUrl, {
                action: 'bgos_test_connection',
                nonce: bgosAdmin.nonce,
                agent_id: agentId,
                server_url: serverUrl
            }, function(response) {
                $btn.prop('disabled', false).text('⚡ Test Connection');
                if (response.success) {
                    $result.addClass('success').text('✓ ' + response.data.message);
                } else {
                    $result.addClass('error').text('✕ ' + (response.data ? response.data.message : bgosAdmin.failed));
                }
            }).fail(function() {
                $btn.prop('disabled', false).text('⚡ Test Connection');
                $result.addClass('error').text('✕ ' + bgosAdmin.failed);
            });
        });

        // Knowledge Base Sync Button
        $('#bgos_btn_sync_kb').on('click', function() {
            var $btn = $(this);
            var $result = $('#bgos_sync_result');

            if (!confirm('This will send your published pages and posts to the BGOS AI agent to train its knowledge base. Continue?')) {
                return;
            }

            $btn.prop('disabled', true).text('Indexing & Syncing...');
            $result.removeClass('success error').text('Crawling website pages and training AI model...');

            $.post(bgosAdmin.ajaxUrl, {
                action: 'bgos_sync_knowledge_base',
                nonce: bgosAdmin.nonce
            }, function(response) {
                $btn.prop('disabled', false).text('🚀 Sync WordPress Content to BGOS AI');
                if (response.success) {
                    $result.addClass('success').text('✓ ' + response.data.message);
                } else {
                    $result.addClass('error').text('✕ ' + (response.data ? response.data.message : 'Sync failed.'));
                }
            }).fail(function() {
                $btn.prop('disabled', false).text('🚀 Sync WordPress Content to BGOS AI');
                $result.addClass('error').text('✕ Network request failed during sync.');
            });
        });
    });
})(jQuery);
