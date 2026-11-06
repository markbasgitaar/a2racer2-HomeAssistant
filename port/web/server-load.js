/*
 * Load the game data from the add-on's own /game/ endpoint.
 *
 * In the Home Assistant add-on, /share/a2racer2 is mapped read-only and nginx
 * serves its JSON file list under /game/. This script adds a button to the
 * page's "choose the game folder" panel. The folder picker stays available:
 * the button only appears when the server actually has an RCS.IMG.
 *
 * The script is loaded after the page's inline script and before the
 * Emscripten loader, so Module exists but its runtime has not started yet.
 */
(function () {
  'use strict';

  var DATA = '/data';
  var GAME = 'game/';
  var RCS = /^RCS\.IMG$/i;
  // the same files the folder picker ignores
  var SKIP = /(^debug\.txt$)|(\.(exe|dll|ico|bak[^/]*)$)|(\.bak_)/i;

  function $(id) {
    return document.getElementById(id);
  }

  function status(text) {
    var el = $('status');
    if (el) el.textContent = text;
  }

  function log(text) {
    var el = $('log');
    if (!el) return;
    el.textContent += text + '\n';
    el.scrollTop = el.scrollHeight;
  }

  function hasLocalData() {
    try {
      Module.FS.stat(DATA + '/RCS.IMG');
      return true;
    } catch (e) {
      return false;
    }
  }

  function sync(populate) {
    return new Promise(function (ok, fail) {
      Module.FS.syncfs(populate, function (e) {
        if (e) fail(e);
        else ok();
      });
    });
  }

  function listDir(dir) {
    var url = GAME + dir.map(encodeURIComponent).join('/');
    if (url.slice(-1) !== '/') url += '/';
    return fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        if (!Array.isArray(data)) throw new Error('unexpected file list');
        return data;
      });
  }

  function fileUrl(dir, name) {
    return GAME + dir.concat(name).map(encodeURIComponent).join('/');
  }

  // Find the shallowest folder that holds RCS.IMG. /share/a2racer2 itself is
  // the normal case; one level down covers a copied CD with its data folder.
  async function findGame() {
    var queue = [[]];
    var visited = 0;
    while (queue.length && visited < 25) {
      var dir = queue.shift();
      visited++;
      var entries = await listDir(dir);
      var files = entries.filter(function (e) {
        return e && e.type === 'file';
      });
      for (var i = 0; i < files.length; i++) {
        if (RCS.test(files[i].name)) return { dir: dir, files: files };
      }
      if (dir.length === 0) {
        entries
          .filter(function (e) {
            return e && e.type === 'directory';
          })
          .forEach(function (e) {
            queue.push([e.name]);
          });
      }
    }
    return null;
  }

  async function loadFromServer() {
    var button = $('server');
    if (button) button.disabled = true;
    try {
      status('Looking for the game files on the server…');
      var game = await findGame();
      if (!game) {
        status(
          'No game files found on the server. Put RCS.IMG, spel.dat and the ' +
            'other game files in /share/a2racer2.'
        );
        if (button) button.disabled = false;
        return;
      }
      var list = game.files.filter(function (e) {
        return !SKIP.test(e.name);
      });
      if (!list.length) throw new Error('the server folder is empty');
      $('pick').classList.add('hidden');
      $('get').classList.add('hidden');
      $('progress').classList.remove('hidden');
      var done = 0;
      for (var i = 0; i < list.length; i++) {
        var file = list[i];
        status('Downloading ' + file.name + '…');
        var r = await fetch(fileUrl(game.dir, file.name), { cache: 'no-store' });
        if (!r.ok) throw new Error(file.name + ': HTTP ' + r.status);
        Module.FS.writeFile(DATA + '/' + file.name, new Uint8Array(await r.arrayBuffer()));
        done++;
        $('progress').value = (done / list.length) * 100;
      }
      status('Saving the game files in this browser…');
      await sync(false);
      $('progress').classList.add('hidden');
      log(list.length + ' files loaded from /share/a2racer2');
      if (typeof window.showReady === 'function') window.showReady();
      else {
        status('The game files are in this browser. Saves are kept here too.');
        $('ready').classList.remove('hidden');
      }
    } catch (e) {
      $('progress').classList.add('hidden');
      $('pick').classList.remove('hidden');
      $('get').classList.remove('hidden');
      if (button) button.disabled = false;
      status('Could not load the game files from the server: ' + (e && e.message ? e.message : e));
    }
  }

  function install() {
    var button = $('server');
    if (!button) return;
    button.addEventListener('click', loadFromServer);
    if (hasLocalData()) return;
    // Probe quietly: without the share mapping there simply is no /game/.
    findGame()
      .then(function (game) {
        if (!game) return;
        button.classList.remove('hidden');
        status(
          'The add-on found the game files in /share/a2racer2. Use them, ' +
            'or choose a folder on this computer.'
        );
      })
      .catch(function (e) {
        console.log('A2 Racer II: server game files unavailable: ' + e.message);
      });
  }

  if (typeof Module !== 'undefined') {
    var ready = Module.onRuntimeInitialized;
    Module.onRuntimeInitialized = async function () {
      if (typeof ready === 'function') {
        try {
          await ready();
        } catch (e) {
          console.log('A2 Racer II: ' + e);
        }
      }
      install();
    };
  }
})();
