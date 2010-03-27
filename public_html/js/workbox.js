/*****************************************************************************/
/*
/* Work box JS
/*
/*****************************************************************************/
/**
 * Called from main.js at end of setup
 */
function init_workbox() {
var
/*-------------- CONSTANTS --------------*/
      WORK_BOX = $('\
    <div class="work-box"> \
    <div class="loading"></div> \
    <h1 id="wb" class="title">work box</h1> \
    <form action="/task/add" method="POST"> \
        <label class="text">Task: <br /> \
            <textarea rows="5" cols="10" name="text"></textarea> \
        </label> \
        <label class="due">Date: <br/> \
            <input type="text" name="due" value="today" /> \
        </label> \
        <div class="share label">Sharing: <br/> \
            <span class="input"></span> \
        </div> \
        <div class="priority label"><span>Priority</span>: \
            <input type="hidden" name="priority" value="3" /> \
            <span class="p"><img src="/css/img/high.png" alt="1" /> High</span> \
            <span class="p"><img src="css/img/med.png" alt="2" /> Medium</span> \
        </div> \
        <input type="submit" name="add" value="Add task" /> \
        <a class="clear" href="#">clear</a> \
    </form> \
    </div><!-- work_box -->')
    , SPINWHEEL = $('<div class="spin"></div>')
    , GROUPS_AUTOCOMPLETE_URL = '/group/f/'
/*-------------- VARIABLES --------------*/
    , workbox_text = {
        'groups_auto': ''
    }
    , autocomplete_timeout = false
    , preventKeyUp = false
;

WORK_BOX.prependTo('#content');

/**
 * Handles moving up and down on the suggestion list
 * and tab + enter.
 */
function autocomplete_keydown(e, obj, class) {
    var text = obj.val()
        , suggest_box = $('.' + class)
        , results = false, active = -1
        , new_text
    ;

    if (suggest_box.is(':visible')) {
        results = suggest_box.children();

        // move to the next one
        active = results.index(results.filter('.active'));
        if (e.keyCode == 40) {
            // down arrow
            results.removeClass('active');
            results.eq(active+1).addClass('active');
            return false;
        } else if (e.keyCode == 38) {
            // up arrow
            results.removeClass('active');
            results.eq(active-1).addClass('active');
            return false;
        } else if (e.keyCode == 13 || e.keyCode == 9) {
            // enter or tab

            new_text = results.eq(active).text();
            obj.val(new_text);
            suggest_box.children().remove();
            suggest_box.hide();
            return false;
        } else if (e.keyCode == 27) {
            // esc
            suggest_box.hide();
            return false;
        }
    }

    return true;
}

/**
 * Handles doing the lookup and filling in suggestions.
 */
function autocomplete_keyup(e, obj, class, the_url) {
    if (preventKeyUp) return false;

    var   text = obj.val()
        , suggest_box = $('.' + class)
    ;
    if (text.length > 20) {
        return false;
    }

    if (text == workbox_text[class]) return false;
    workbox_text[class] = text;
    if (text.indexOf(':') >= 0) {
        return false;
    }

    if (text.length <= 0) {
        suggest_box.hide();
        return false;
    }

    lookup = text;

    if (autocomplete_timeout) clearTimeout(autocomplete_timeout);
    autocomplete_timeout = setTimeout(function () {
    $.ajax({
        url: the_url,
        type: 'POST',
        async: true,
        cache: false,
        dataType: 'json',
        data: {'name': lookup},
        timeout: 3000,
        global: false,
        error: function(request, textStatus, errorThrown) {
            console.log('Error trying to autocomplete.');
        },
        success: function(data, textStatus, request) {
            suggest_box.children().remove();
            if (data.message) {
                return;
            }
            var result, qresult;
            for (var i in data.results) {
                result = data.results[i];
                qresult = $('<li></li>');
                qresult.html(result.name);
                qresult.appendTo(suggest_box);
            }
            if (data.results.length > 0) {
                suggest_box.show();
            } else {
                suggest_box.hide();
            }
        }
    })
    }, 200); // setTimeout
}



$('.autocomplete li').live('mousedown', function() {
    var e = {'keyCode': 13}
        , obj = $('.work-box textarea')
        , class = 'groups_auto'
    ;
    $(this).siblings().removeClass('active');
    $(this).addClass('active');
    autocomplete_keydown(e, obj, class);
    obj.focus();
});

$('.work-box input[type="submit"]').live('click', function () {
    var   form_data = $('.work-box form').serialize()
        , work_box = $('.work-box')
    $.ajax({
        type: 'POST',
        url: work_box.find('form').attr('action'),
        data: form_data + '&add=1',
        beforeSend: function() {
            SPINWHEEL.show();
        },
        error: function (response, text_status, error) {
            SPINWHEEL.hide();
            return task_error_ajax(response, text_status, error);
        },
        success: function(response) {
            update_groups(response.groups);
            SPINWHEEL.hide();
        }
    });
    return false;
});

function manage_share(the_input) {
    var   s_obj = $('.share .input')
        , s_text = s_obj.text()
        , new_text = the_input.next().html()
        , this_in_regex = new RegExp('([ ]|^)' + new_text + '([ ]|$)')
        , this_in = this_in_regex.exec(s_text)
    ;

    if (the_input.is(':checked') &&
        the_input.parents('ul').find(':checked').length <= 1) {
        the_input.attr('checked', '');
    }

    if (!the_input.is(':checked')) {
        if (this_in == null) {
            s_obj.text(s_text + ' ' + new_text);
        }
    } else {
        s_obj.text(s_text.replace(this_in_regex, ' '));
    }
}

$('.work-box .share li').live('mousedown', function (e) {
    var the_input = $(this).find('input');
    if (!the_input.is(':checked') &&
        the_input.parents('ul').find(':checked').length <= 1) {
        the_input.attr('checked', '');
    }

    return false;
});

$('.work-box .share li span').live('mousedown', function () {
    var the_input = $(this).prev();
    manage_share(the_input);
    return false;
});

$('.work-box .share li input').live('mousedown', function () {
    var the_input = $(this);
    manage_share(the_input);
    return false;
});

$('.work-box textarea')

    .keydown(function(e) {
    preventKeyUp = !autocomplete_keydown(e, $(this), 'groups_auto', false);
    return !preventKeyUp;
})

    .keyup(function(e) {
    return autocomplete_keyup(e, $(this), 'groups_auto', GROUPS_AUTOCOMPLETE_URL, false);
})

    .focus(function(e) {
    if ($('.work-box .groups_auto').children().length > 0) {
        $('.work-box .groups_auto').show();
    }
})
    .blur(function(e) {
    $('.work-box .groups_auto').hide();
});

/**
* priority update on image
*/
$('.work-box .priority .p').click(function() {
    if ($(this).hasClass('s')) {
        $(this).parents('.priority').find('input').val('3');
        $(this).removeClass('s');
    }
    else {
        $(this).parents('.priority').find('.p')
            .removeClass('s');
        $(this).parents('.priority').find('input')
            .val($(this).find('img').attr('alt'));
        $(this)
            .addClass('s');
    }
    return false;
});


/**
    * Clears the workbox
    */
function clear_workbox() {
    var WORK_BOX = $('.work-box');
    $('textarea', WORK_BOX)[0].value = '';
    $('input[name="due"]', WORK_BOX).val('today');
    $('.share .input', WORK_BOX).val(CURRENT_USER.name);
    $('.priority input', WORK_BOX).val('3');
    $('.priority .p', WORK_BOX).removeClass('s');
}

$('.work-box .clear').live('click', function () {
    clear_workbox();
    return false;
});

$('.work-box label:first').append('<ul class="groups_auto autocomplete hide"></ul>');

// add list of users to share
var share_with = FOLLOWERS_TEMPLATE.clone(),
    current_user = share_with
        .find('input.u' + CURRENT_USER.id).attr('checked', 'checked')
        .parent().parent()
        .prependTo(share_with);
$('.work-box .share .input')
    .text(current_user.find('span').text());

share_with
    .appendTo('.work-box .share');


$('.work-box')
    .append(SPINWHEEL);
SPINWHEEL.hide();

/**
 * From http://blog.vishalon.net/index.php/javascript-getting-and-setting-caret-position-in-textarea/
 */
function getCaretPosition(ctrl) {
    var CaretPos = 0;   // IE Support
    if (document.selection) {
    ctrl.focus ();
        var Sel = document.selection.createRange ();
        Sel.moveStart ('character', -ctrl.value.length);
        CaretPos = Sel.text.length;
    }
    // Firefox support
    else if (ctrl.selectionStart || ctrl.selectionStart == '0')
        CaretPos = ctrl.selectionStart;
    return (CaretPos);
}
function setCaretPosition(ctrl, pos){
    if(ctrl.setSelectionRange)
    {
        ctrl.focus();
        ctrl.setSelectionRange(pos,pos);
    }
    else if (ctrl.createTextRange) {
        var range = ctrl.createTextRange();
        range.collapse(true);
        range.moveEnd('character', pos);
        range.moveStart('character', pos);
        range.select();
    }
}
String.prototype.trim = function() {
    return this.replace(/^\s+|\s+$/g,"");
}

} // end init_workbox