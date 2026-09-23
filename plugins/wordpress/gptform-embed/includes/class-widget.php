<?php
/**
 * GPTForm Embed — WordPress sidebar widget.
 *
 * Allows placing a GPTForm form in any theme sidebar.
 */
class GPTForm_Widget extends WP_Widget {

    public function __construct() {
        parent::__construct(
            'gptform_widget',
            __('GPTForm Embed', 'gptform-embed'),
            array(
                'description' => __('Embed a GPTForm AI-powered form in your sidebar.', 'gptform-embed'),
            )
        );
    }

    public static function init() {
        register_widget('GPTForm_Widget');
    }

    public function widget($args, $instance) {
        $form_id = !empty($instance['form_id']) ? $instance['form_id'] : '';
        if (empty($form_id)) return;

        $mode = !empty($instance['mode']) ? $instance['mode'] : 'js';

        echo $args['before_widget'];
        if (!empty($instance['title'])) {
            echo $args['before_title'] . apply_filters('widget_title', $instance['title']) . $args['after_title'];
        }

        $core = GPTForm_Embed::instance();
        echo $core->render_embed($form_id, array(
            'mode' => $mode,
            'height' => !empty($instance['height']) ? $instance['height'] : '400px',
            'branding' => isset($instance['branding']) ? $instance['branding'] === '1' : true,
        ));

        echo $args['after_widget'];
    }

    public function form($instance) {
        $form_id = !empty($instance['form_id']) ? $instance['form_id'] : '';
        $title = !empty($instance['title']) ? $instance['title'] : '';
        $mode = !empty($instance['mode']) ? $instance['mode'] : 'js';
        $height = !empty($instance['height']) ? $instance['height'] : '400px';
        $branding = isset($instance['branding']) ? $instance['branding'] : '1';
        ?>
        <p>
            <label for="<?php echo $this->get_field_id('title'); ?>"><?php _e('Title:', 'gptform-embed'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('title'); ?>" name="<?php echo $this->get_field_name('title'); ?>" type="text" value="<?php echo esc_attr($title); ?>" />
        </p>
        <p>
            <label for="<?php echo $this->get_field_id('form_id'); ?>"><?php _e('Form ID or Slug:', 'gptform-embed'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('form_id'); ?>" name="<?php echo $this->get_field_name('form_id'); ?>" type="text" value="<?php echo esc_attr($form_id); ?>" placeholder="e.g. abc123 or my-booking-form" />
        </p>
        <p>
            <label for="<?php echo $this->get_field_id('mode'); ?>"><?php _e('Embed Mode:', 'gptform-embed'); ?></label>
            <select class="widefat" id="<?php echo $this->get_field_id('mode'); ?>" name="<?php echo $this->get_field_name('mode'); ?>">
                <option value="js" <?php selected($mode, 'js'); ?>><?php _e('JavaScript (Recommended)', 'gptform-embed'); ?></option>
                <option value="iframe" <?php selected($mode, 'iframe'); ?>><?php _e('Iframe (Fallback)', 'gptform-embed'); ?></option>
            </select>
        </p>
        <p>
            <label for="<?php echo $this->get_field_id('height'); ?>"><?php _e('Min Height:', 'gptform-embed'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('height'); ?>" name="<?php echo $this->get_field_name('height'); ?>" type="text" value="<?php echo esc_attr($height); ?>" placeholder="400px" />
        </p>
        <p>
            <label>
                <input type="checkbox" name="<?php echo $this->get_field_name('branding'); ?>" value="1" <?php checked($branding, '1'); ?> />
                <?php _e('Show "Powered by GPTForm" branding', 'gptform-embed'); ?>
            </label>
        </p>
        <?php
    }

    public function update($new_instance, $old_instance) {
        $instance = array();
        $instance['title'] = (!empty($new_instance['title'])) ? sanitize_text_field($new_instance['title']) : '';
        $instance['form_id'] = (!empty($new_instance['form_id'])) ? sanitize_text_field($new_instance['form_id']) : '';
        $instance['mode'] = (!empty($new_instance['mode'])) ? sanitize_text_field($new_instance['mode']) : 'js';
        $instance['height'] = (!empty($new_instance['height'])) ? sanitize_text_field($new_instance['height']) : '400px';
        $instance['branding'] = isset($new_instance['branding']) ? '1' : '0';
        return $instance;
    }
}
