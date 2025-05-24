import Cookie from 'js-cookie'; 
import $ from 'jquery';  // jQuery is required for AJAX requests

let csrfToken = null;
await $.ajax({
    url: 'http://localhost:8000/api/get_csrf',
    type: 'GET',
    contentType: 'application/json',
    xhrFields: {
        withCredentials: true  // include cookies in the request
    },
    success: function (data) {
    },
    error: function (xhr, status, error) {
        console.error('Error:', error);
    }
}).then(() => {
    csrfToken = Cookie.get('csrftoken');
    $.ajaxSetup({
        headers: {'X-CSRFToken': csrfToken},
        xhrFields: {withCredentials: true }
    });
})

let userInfo = null;
let treeStructure = null;
let idToBookmark = null;
await $.ajax({
    url: 'http://localhost:8000/api/bookmarks/init',
    type: 'POST',
    contentType: 'application/json',
    crossDomain: true,
    xhrFields: {
        withCredentials: true
    },
    success: function (data) {
        userInfo = data.userInfo;
        treeStructure = data.treeStructure;
        idToBookmark = data.idToBookmark;

        console.log('init data from server');
        console.log('username', userInfo);
        console.log('treeStructure', treeStructure);
        console.log('idToBookmark', idToBookmark);
    },
    error: function (xhr, status, error) {
        console.error('Error:', error);
    }
})

export { userInfo, treeStructure, idToBookmark as idToFile };