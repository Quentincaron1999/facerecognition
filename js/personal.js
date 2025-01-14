(function (OC, window, $, undefined) {
'use strict';

$(document).ready(function () {

const state = {
    OK: 0,
    FALSE: 1,
    SUCCESS: 2,
    ERROR:  3
}

/*
 * Faces in memory handlers.
 */
var Persons = function (baseUrl) {
    this._baseUrl = baseUrl;
    this._enabled = false;
    this._persons = [];
    this._person = undefined;
    this._loaded = false;
};

Persons.prototype = {
    load: function () {
        var deferred = $.Deferred();
        var self = this;
        $.get(this._baseUrl+'/persons').done(function (response) {
            self._enabled = response.enabled;
            self._persons = response.clusters;
            self._loaded = true;
            deferred.resolve();
        }).fail(function () {
            deferred.reject();
        });
        return deferred.promise();
    },
    loadPerson: function (id) {
        this.unsetPerson();

        var deferred = $.Deferred();
        var self = this;
        $.get(this._baseUrl+'/person/'+id).done(function (person) {
            self._person = person;
            deferred.resolve();
        }).fail(function () {
            deferred.reject();
        });
        return deferred.promise();
    },
    unsetPerson: function () {
        this._person = undefined;
    },
    getActive: function () {
        return this._person;
    },
    isLoaded: function () {
        return this._loaded;
    },
    isEnabled: function () {
        return this._enabled;
    },
    sortBySize: function () {
        this._persons.sort(function(a, b) {
            return b.faces.length - a.faces.length;
        });
    },
    getAll: function () {
        return this._persons;
    },
    rename: function (personId, personName) {
        var self = this;
        var deferred = $.Deferred();
        var opt = { name: personName };
        $.ajax({url: this._baseUrl + '/person/' + personId,
                method: 'PUT',
                contentType: 'application/json',
                data: JSON.stringify(opt)
        }).done(function (data) {
            self._persons.forEach(function (person) {
                if (person.id === personId) {
                    person.name = personName;
                }
            });
            deferred.resolve();
        }).fail(function () {
            deferred.reject();
        });
        return deferred.promise();
    }
};

/*
 * View.
 */
var View = function (persons) {
    this._persons = persons;
};

View.prototype = {
    reload: function (name) {
        var self = this;
        this._persons.load().done(function () {
            self.renderContent();
        }).fail(function () {
            OC.Notification.showTemporary(t('facerecognition', 'There was an error trying to show your friends'));
        });
    },
    setEnabledUser: function (enabled) {
        var self = this;
        $.ajax({
            type: 'POST',
            url: OC.generateUrl('apps/facerecognition/setuservalue'),
            data: {
                'type': 'enabled',
                'value': enabled
            },
            success: function () {
                if (enabled) {
                    OC.Notification.showTemporary(t('facerecognition', 'The analysis is enabled, please be patient, you will soon see your friends here.'));
                } else {
                    OC.Notification.showTemporary(t('facerecognition', 'The analysis is disabled. Soon all the information found for facial recognition will be removed.'));
                }
                self.reload();
            }
        });
    },
    renderContent: function () {
        this._persons.sortBySize();
        var context = {
            loaded: this._persons.isLoaded(),
            persons: this._persons.getAll(),
            appName: t('facerecognition', 'Face Recognition'),
            welcomeHint: t('facerecognition', 'Here you can see photos of your friends that are recognized'),
            enableDescription: t('facerecognition', 'Analyze my images and group my loved ones with similar faces'),
            loadingMsg: t('facerecognition', 'Looking for your recognized friends'),
            loadingIcon: OC.imagePath('core', 'loading.gif')
        };

        if (this._persons.isEnabled() === 'true') {
            context.enabled = true;
            context.emptyMsg = t('facerecognition', 'Your friends have not been recognized yet');
            context.emptyHint = t('facerecognition', 'Please, be patient');
        }
        else {
            context.emptyMsg = t('facerecognition', 'The analysis is disabled');
            context.emptyHint = t('facerecognition', 'Enable it to find your loved ones');
        }

        if (this._persons.getActive() !== undefined)
            context.person = this._persons.getActive();

        var html = Handlebars.templates['personal'](context);
        $('#div-content').html(html);

        const observer = lozad('.face-preview');
        observer.observe();

        var self = this;

        $('#enableFacerecognition').click(function() {
            var enabled = $(this).is(':checked');
            if (enabled === false) {
                OC.dialogs.confirm(
                    t('facerecognition', 'You will lose all the information analyzed, and if you re-enable it, you will start from scratch.'),
                    t('facerecognition', 'Do you want to deactivate the grouping by faces?'),
                    function (result) {
                        if (result === true) {
                            self.setEnabledUser (false);
                        } else {
                            $('#enableFacerecognition').prop('checked', true);
                        }
                    },
                    true
                );
            } else {
                self.setEnabledUser (true);
            }
        });

        $('#facerecognition .person-name').click(function () {
            var id = $(this).parent().data('id');
            self._persons.loadPerson(id).done(function () {
                self.renderContent();
            }).fail(function () {
                OC.Notification.showTemporary(t('facerecognition', 'There was an error when trying to find photos of your friend'));
            });
        });

        $('#facerecognition .icon-rename').click(function () {
            var id = $(this).parent().data('id');
            OC.dialogs.prompt(
                t('facerecognition', 'Please enter a name to rename the person'),
                t('facerecognition', 'Rename Person'),
                function(result, value) {
                    if (result === true && value) {
                        self._persons.rename (id, value).done(function () {
                            self._persons.unsetPerson();
                            self.renderContent();
                        }).fail(function () {
                            OC.Notification.showTemporary(t('facerecognition', 'There was an error renaming this person'));
                        });
                    }
                },
                true,
                t('facerecognition', 'Rename'),
                false
            ).then(function() {
                var $dialog = $('.oc-dialog:visible');
                var $buttons = $dialog.find('button');
                $buttons.eq(0).text(t('facerecognition', 'Cancel'));
                $buttons.eq(1).text(t('facerecognition', 'Rename'));
            });
        });
    }
};

/*
 * Main app.
 */
var persons = new Persons(OC.generateUrl('/apps/facerecognition'));

var view = new View(persons);

view.renderContent();

persons.load().done(function () {
    view.renderContent();
}).fail(function () {
    OC.Notification.showTemporary(t('facerecognition', 'There was an error trying to show your friends'));
});


}); // $(document).ready(function () {
})(OC, window, jQuery); // (function (OC, window, $, undefined) {