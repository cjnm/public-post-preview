/* eslint-disable no-var, object-shorthand */
( function ( $, ajaxurl, l10n ) {
	var DSPublicPostPreview = {
		/**
		 * Initializes the plugin.
		 *
		 * @since 2.0.0
		 */
		initialize: function () {
			var t = this;

			t.checkbox = $( '#public-post-preview' );
			t.link = $( '#public-post-preview-link' );
			t.linkInput = t.link.find( 'input' );
			t.nonce = $( '#public_post_preview_wpnonce' );
			t.status = $( '#public-post-preview-ajax' );
			t.expirySection = $( '#public-post-preview-expiry' );
			t.expiryTypeSelect = $( '#public-post-preview-expiry-type' );
			t.customTimeDiv = $( '#public-post-preview-custom-time' );
			t.daysInput = $( '#public-post-preview-days' );
			t.hoursInput = $( '#public-post-preview-hours' );
			t.minutesInput = $( '#public-post-preview-minutes' );
			t.savedMsg = $( '#public-post-preview-saved-msg' );
			t.expiryTimeDisplay = $( '#public-post-preview-expiry-time' );
			t.expiryDisplayMain = $( '#public-post-preview-expiry-display' );

			console.log( 'DSPublicPostPreview initialized', {
				checkbox: t.checkbox.length,
				expiryTypeSelect: t.expiryTypeSelect.length,
				expiryTypeValue: t.expiryTypeSelect.val(),
				customTimeDiv: t.customTimeDiv.length,
			} );

			t.status.css( 'opacity', 0 );

			t.checkbox.bind( 'change', function () {
				t.change();
			} );

			t.expiryTypeSelect.on( 'change', function () {
				t.toggleCustomTime();
				t.saveExpirySettings();
			} );

			t.daysInput.on( 'change', function () {
				t.updateExpiryDisplay();
				t.saveExpirySettings();
			} );

			t.hoursInput.on( 'change', function () {
				t.updateExpiryDisplay();
				t.saveExpirySettings();
			} );

			t.minutesInput.on( 'change', function () {
				t.updateExpiryDisplay();
				t.saveExpirySettings();
			} );

			t.linkInput.on( 'focus', function () {
				$( this ).select();
			} );

			// Update expiry display on page load
			t.updateExpiryDisplay();

			// Ensure expiry fields are always submitted
			$( '#post' ).on( 'submit', function () {
				// Make sure hidden fields are still submitted
				if ( t.expiryTypeSelect.length ) {
					t.expiryTypeSelect.prop( 'disabled', false );
				}
				if ( t.daysInput.length ) {
					t.daysInput.prop( 'disabled', false );
				}
				if ( t.hoursInput.length ) {
					t.hoursInput.prop( 'disabled', false );
				}
				if ( t.minutesInput.length ) {
					t.minutesInput.prop( 'disabled', false );
				}
			} );
		},

		/**
		 * Handles a checkbox change.
		 *
		 * @since 2.0.0
		 */
		change: function () {
			var t = this,
				checked = t.checkbox.prop( 'checked' ) ? 'true' : 'false';

			// Disable the checkbox, to prevent double AJAX requests
			t.checkbox.prop( 'disabled', 'disabled' );

			t.request(
				{
					_ajax_nonce: t.nonce.val(),
					checked: checked,
					post_ID: $( '#post_ID' ).val(),
				},
				function ( response ) {
					if ( response.success ) {
						if ( 'true' === checked ) {
							t.status.text( l10n.enabled );
							t._pulsate( t.status, 'green' );
						} else {
							t.status.text( l10n.disabled );
							t._pulsate( t.status, 'red' );
						}

						// Add preview link
						if ( response.data && response.data.preview_url ) {
							t.linkInput.val( response.data.preview_url );
						} else {
							t.linkInput.val( '' );
						}

						// Toggle visibility of the link and expiry section
						t.link.toggleClass( 'ppp-hidden' );
						t.expirySection.toggleClass( 'ppp-hidden' );
					}

					// Enable the checkbox again
					t.checkbox.prop( 'disabled', '' );
				}
			);
		},

		/**
		 * Toggles the custom time input visibility.
		 *
		 * @since 3.1.0
		 */
		toggleCustomTime: function () {
			var t = this,
				expiryType = t.expiryTypeSelect.val();

			console.log( 'Toggle custom time, type:', expiryType );

			if ( 'custom' === expiryType ) {
				t.customTimeDiv.removeClass( 'ppp-hidden' );
				t.daysInput.prop( 'disabled', false );
				t.hoursInput.prop( 'disabled', false );
				t.minutesInput.prop( 'disabled', false );

				// Set default 48 hours if all fields are empty
				if ( ! t.daysInput.val() && ! t.hoursInput.val() && ! t.minutesInput.val() ) {
					t.hoursInput.val( 48 );
					// Save immediately with the default 48 hours
					t.saveExpirySettings();
					return;
				}
			} else {
				t.customTimeDiv.addClass( 'ppp-hidden' );
				t.daysInput.prop( 'disabled', true );
				t.hoursInput.prop( 'disabled', true );
				t.minutesInput.prop( 'disabled', true );
			}

			// Save expiry settings via AJAX
			t.saveExpirySettings();
		},

		/**
		 * Updates the expiry time display.
		 *
		 * @since 3.1.0
		 */
		updateExpiryDisplay: function () {
			var t = this,
				expiryType = t.expiryTypeSelect.val(),
				expiryTimestamp = parseInt( t.expiryTypeSelect.data( 'expiry-timestamp' ) ) || 0,
				previewCreated = parseInt( t.expiryTypeSelect.data( 'preview-created' ) ) || 0;

			// Clear displays
			t.expiryTimeDisplay.text( '' );
			t.expiryDisplayMain.text( '' );

			if ( 'always' === expiryType ) {
				t.expiryDisplayMain.text( 'Preview will never expire' );
				return;
			}

			if ( '48hours' === expiryType ) {
				// Calculate 48 hours from preview creation time
				if ( previewCreated > 0 ) {
					var expiryDate = new Date( ( previewCreated + ( 48 * 60 * 60 ) ) * 1000 );
					var options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
					var formattedDate = expiryDate.toLocaleDateString( 'en-US', options );
					t.expiryDisplayMain.text( 'Expires on: ' + formattedDate );
				}
				return;
			}

			if ( 'custom' === expiryType ) {
				var days = parseInt( t.daysInput.val() ) || 0,
					hours = parseInt( t.hoursInput.val() ) || 0,
					minutes = parseInt( t.minutesInput.val() ) || 0;

				if ( days === 0 && hours === 0 && minutes === 0 ) {
					t.expiryTimeDisplay.text( '' );
					return;
				}

				// Calculate expiry date
				var now = new Date();
				var expiryDate = new Date( now.getTime() + ( days * 24 * 60 * 60 * 1000 ) + ( hours * 60 * 60 * 1000 ) + ( minutes * 60 * 1000 ) );

				// Format the date and time
				var options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
				var formattedDate = expiryDate.toLocaleDateString( 'en-US', options );

				t.expiryTimeDisplay.text( 'Expires on: ' + formattedDate );
			}
		},

		/**
		 * Saves expiry settings via AJAX.
		 *
		 * @since 3.1.0
		 */
		saveExpirySettings: function () {
			var t = this;

			if ( ! t.checkbox.prop( 'checked' ) ) {
				console.log( 'Preview not checked, skipping save' );
				return; // Only save if preview is enabled
			}

			var postId = $( '#post_ID' ).val();
			var expiryType = t.expiryTypeSelect.val();
			var days = parseInt( t.daysInput.val() ) || 0;
			var hours = parseInt( t.hoursInput.val() ) || 0;
			var minutes = parseInt( t.minutesInput.val() ) || 0;
			var nonce = t.nonce.val();

			console.log( 'Saving expiry settings:', { postId, expiryType, days, hours, minutes, nonce } );

			var data = {
				action: 'public-post-preview-save-expiry',
				_ajax_nonce: nonce,
				post_ID: postId,
				expiry_type: expiryType,
				days: days,
				hours: hours,
				minutes: minutes,
			};

			$.ajax( {
				type: 'POST',
				url: ajaxurl,
				data: data,
				success: function ( response ) {
					console.log( 'Save response:', response );
					// Show success message
					t.savedMsg.stop( true, true ).show().delay( 3000 ).fadeOut();
				},
				error: function ( error ) {
					console.log( 'Save error:', error );
					// Show error message
					t.status.text( 'Error saving settings' );
					t._pulsate( t.status, 'red' );
				},
			} );
		},

		/**
		 * Does the AJAX request.
		 *
		 * @since  2.0.0
		 *
		 * @param {Object} data     The data to send.
		 * @param {Object} callback Callback function for a successful request.
		 */
		request: function ( data, callback ) {
			$.ajax( {
				type: 'POST',
				url: ajaxurl,
				data: $.extend( data, {
					action: 'public-post-preview',
				} ),
				success: callback,
			} );
		},

		/**
		 * Helper for a pulse effect.
		 *
		 * @since  2.0.0
		 *
		 * @param {Object} e     The element.
		 * @param {string} color The text color of the element.
		 */
		_pulsate: function ( e, color ) {
			e.css( 'color', color )
				.animate( { opacity: 1 }, 600, 'linear' )
				.animate( { opacity: 0 }, 600, 'linear', function () {
					e.empty();
				} );
		},
	};

	// Document is ready.
	$( DSPublicPostPreview.initialize() );
} )( window.jQuery, window.ajaxurl, window.DSPublicPostPreviewL10n );
