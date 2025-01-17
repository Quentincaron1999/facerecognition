'use strict';
$(document).ready(function() {
    const state = {
        OK: 0,
        FALSE: 1,
        SUCCESS: 2,
        ERROR:  3
    }

    /*
     * Progress
     */
    function checkProgress() {
        $.get(OC.generateUrl('/apps/facerecognition/process')).done(function (progress) {
            if (progress.status) {
                var estimatedFinalizeDate = Date.now()/1000 + progress.estimatedFinalize;
                var desc = t('facerecognition', 'Analyzing images');
                desc += ' - ';
                desc += t('facerecognition', '{processedImages} of {totalImages} - Ends approximately {estimatedFinalize}',
                         {processedImages: progress.processedImages, totalImages: progress.totalImages, estimatedFinalize: relative_modified_date(estimatedFinalizeDate)});

                $('#progress-text').html(desc);

                $('#progress-text').html(desc);
                $('#progress-bar').attr('value', progress.processedImages);
                $('#progress-bar').attr('max', progress.totalImages);
            } else {
                $('#progress-bar').attr('value', 0);
                var desc = t('facerecognition', 'Stopped');
                desc += ' - ';
                desc += t('facerecognition', '{processedImages} images in queue', {processedImages: (progress.totalImages - progress.processedImages)});

                $('#progress-text').html(desc);
            }
        });
    }

    /*
     * Sensitivity
     */
    function getSensitivity() {
        $.ajax({
            type: 'GET',
            url: OC.generateUrl('apps/facerecognition/getappvalue'),
            data: {
                'type': 'sensitivity',
            },
            success: function (data) {
                if (data.status === state.OK) {
                    var sensitivity = parseFloat(data.value);
                    $('#sensitivity-range').val(sensitivity);
                    $('#sensitivity-value').html(sensitivity);
                }
            }
        });
    }

    $('#sensitivity-range').on('input', function() {
        $('#sensitivity-value').html(this.value);
        $('#restore-sensitivity').show();
        $('#save-sensitivity').show();
    });

    $('#restore-sensitivity').on('click', function(event) {
        event.preventDefault();
        getSensitivity();

        $('#restore-sensitivity').hide();
        $('#save-sensitivity').hide();
    });

    $('#save-sensitivity').on('click', function(event) {
        event.preventDefault();
        var sensitivity = $('#sensitivity-range').val().toString();
        $.ajax({
            type: 'POST',
            url: OC.generateUrl('apps/facerecognition/setappvalue'),
            data: {
                'type': 'sensitivity',
                'value': sensitivity
            },
            success: function (data) {
                if (data.status === state.SUCCESS) {
                    OC.Notification.showTemporary(t('facerecognition', 'The changes were saved. It will be taken into account in the next analysis.'));
                    $('#restore-sensitivity').hide();
                    $('#save-sensitivity').hide();
                }
            }
        });
    });

    /*
     * MemoryLimits
     */
    function getMemoryLimits() {
        $.ajax({
            type: 'GET',
            url: OC.generateUrl('apps/facerecognition/getappvalue'),
            data: {
                'type': 'memory-limits',
            },
            success: function (data) {
                var memory = OC.Util.humanFileSize(data.value, false);
                if (data.status === state.OK) {
                    $('#memory-limits-text').val(memory);
                }
                $('#memory-limits-value').html(memory);
            }
        });
    }

    $('#memory-limits-text').on('input', function() {
        var memory = OC.Util.computerFileSize (this.value);
        $('#restore-memory-limits').show();
        if (memory !== null) {
            var human = OC.Util.humanFileSize(memory, false);
            $('#memory-limits-value').html(human);
            $('#save-memory-limits').show();
        } else {
            $('#memory-limits-value').html("...");
            $('#save-memory-limits').hide();
        }
    });

    $('#restore-memory-limits').on('click', function(event) {
        event.preventDefault();
        getMemoryLimits();

        $('#restore-memory-limits').hide();
        $('#save-memory-limits').hide();
    });

    $('#save-memory-limits').on('click', function(event) {
        event.preventDefault();
        var memoryInput = $('#memory-limits-text').val().toString();
        var memory = OC.Util.computerFileSize(memoryInput);
        $.ajax({
            type: 'POST',
            url: OC.generateUrl('apps/facerecognition/setappvalue'),
            data: {
                'type': 'memory-limits',
                'value': memory
            },
            success: function (data) {
                if (data.status === state.SUCCESS) {
                    OC.Notification.showTemporary(t('facerecognition', 'The changes were saved. It will be taken into account in the next analysis.'));
                    var memory = OC.Util.humanFileSize(data.value, false);
                    $('#memory-limits-text').val(memory);
                    $('#restore-memory-limits').hide();
                    $('#save-memory-limits').hide();
                }
                else {
                    var message = t('facerecognition', 'The change could not be applied.');
                    message += " - " + data.message;
                    OC.Notification.showTemporary(message);
                }
            }
        });
    });

    /*
     * Get initial values.
     */
    getSensitivity();
    getMemoryLimits();
    checkProgress();

    /*
     * Update progress
     */
    window.setInterval(checkProgress, 5000);

});