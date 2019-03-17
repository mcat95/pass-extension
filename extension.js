const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const Shell = imports.gi.Shell;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const ScrollablePopupMenu = Me.imports.scrollablePopupMenu.ScrollablePopupMenu;
const Convenience = Me.imports.convenience;
const Util = imports.misc.util;
const Clutter = imports.gi.Clutter;
const Search = imports.ui.search;

const getPassword = route => GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, function() {
  let out = GLib.spawn_async(
    null,
    ['pass', '-c', route],
    null,
    GLib.SpawnFlags.SEARCH_PATH,
    null
  );
  return false; // Don't repeat
}, null);

class IconMenuItem extends PopupMenu.PopupMenuItem {
  constructor(icon_name, text) {
    super(text);
    let icon = new St.Icon({icon_name: icon_name, icon_size: 25});
    this.actor.insert_child_at_index(icon,1);
  }
};

class SeparatorMenuItem extends PopupMenu.PopupBaseMenuItem {
  constructor(text) {
    super({ reactive: false, can_focus: false});
    this._separator = new St.Widget({ style_class: 'popup-separator-menu-item',
                                      y_expand: true,
                                      y_align: Clutter.ActorAlign.CENTER });
    this.actor.add(this._separator, { expand: true });
  }
};

class PassSearchProvider {

  constructor(getPassword){
    this._results = [];
    this._getPassword = getPassword;
  }

  _insertResults(routes){
    return routes.filter(r => r).map(route => {
      if(this._results.some(res => res.route === route)){
        return this._results.reduce((prev, curr, i) => curr.route === route ? i : prev, 0);
      } else {
        return this._results.push({
          route: route, //Complete route
          name: route.split("/").slice(-1).join("/").split(".").slice(0,-1).join('.'), //Only last 2 terms
          partialRoute: route.split('/').slice(1).join('/').split('.').slice(0,-1).join('.') //All except password directory,
        }) - 1;
      }
    });
  }

  getInitialResultSet(terms, callback, cancellable){
    let cmd = "find .password-store -regextype awk -regex '"+terms.map(term => ".*"+term+".*\.gpg").join("|")+"'";
    let [res, out, err, status] = GLib.spawn_command_line_sync(cmd);
    res = this._insertResults(out.toString().split('\n'));
    callback(res);
  }

  getSubsearchResultSet(prevRes, terms, callback, cancellable){
    this.getInitialResultSet(terms, callback, cancellable);
  }

  getResultMetas(results, callback, cancellable){
    const lresults = this._results;
    callback(results.map(function(resultId){
      return {
        id: resultId,
        name: lresults[resultId].name,
        description: 'Password for '+lresults[resultId].route,
        createIcon: function(size) {
          return new St.Icon({
            icon_size: size,
            icon_name: 'dialog-password',
          });
        }
      };
    }));
  }

  activateResult(result, terms){
    this._getPassword(this._results[result].partialRoute);
  }

  filterResults(providerResults, maxResults) {
    return providerResults.slice(0,maxResults);
  }
};


class PasswordManager extends PanelMenu.Button {

  constructor(getPassword) {
    super(0.0);
    this._current_directory = '/';
    this._getPassword = getPassword;

    let popupMenu = new ScrollablePopupMenu(this.actor, St.Align.START, St.Side.TOP);
    this.popupMenu = popupMenu;
    this.setMenu(popupMenu);

    let hbox = new St.BoxLayout({ style_class: 'panel-status-menu-box' });
    let icon = new St.Icon({icon_name: 'dialog-password-symbolic', style_class: 'system-status-icon'});

    hbox.add_child(icon);
    this.actor.add_actor(hbox);
    Main.panel.addToStatusArea('passwordManager', this);
    this._draw_directory();

    Main.wm.addKeybinding(
      "show-menu-keybinding",
      Convenience.getSettings(),
      Meta.KeyBindingFlags.NONE,
      Shell.ActionMode.NORMAL,
      function() {
        this.popupMenu.open();
        this.popupMenu.box.get_children()[0].grab_key_focus();
      }.bind(this)
    );
  }

  _change_dir(dir) {
    this._current_directory = dir;
    this._draw_directory();
    this.popupMenu.box.get_children()[0].grab_key_focus();
  }

  _draw_directory() {
    this.menu.removeAll();
    let item = new IconMenuItem('go-up',this._current_directory);
    item.connect('activate', function() {
      this._change_dir(this._current_directory.split("/").slice(0,-2).join("/") + "/");
    }.bind(this));
    this.menu.addMenuItem(item);
    this.menu.addMenuItem(new SeparatorMenuItem());

    let fd = Gio.file_new_for_path(".password-store/"+this._current_directory);
    let enumerator = fd.enumerate_children("standard::*", 0, null);
    let data = [];
    var entry;
    while (entry = enumerator.next_file(null)) {
      if (entry.get_name()[0] == '.')
        continue;
      data.push({
        directory: entry.get_file_type() == Gio.FileType.DIRECTORY,
        name: entry.get_name(),
      });
    }
    data.sort(function(a, b) {
      if (a.directory && !b.directory) {
        return -1;
      } else if (b.directory && !a.directory) {
        return 1;
      } else {
        return a.name > b.name;
      }
    }).forEach(element => {
      let menuElement;
      if(element.directory) {
        menuElement = new IconMenuItem('folder', element.name+"/");
        menuElement.connect('activate', function() {
          this._change_dir(this._current_directory + element.name + "/");
        }.bind(this));
      } else {
        let name = element.name.split(".").slice(0,-1).join(".");
        menuElement = new IconMenuItem('dialog-password',name);
        menuElement.connect('activate', function(){
          this._getPassword(this._current_directory + name);
        }.bind(this));
      }
      this.menu.addMenuItem(menuElement);
    });
  }
};

let passwordManager;
let searchProvider;

function enable() {
  passwordManager = new PasswordManager(getPassword);
  searchProvider = new PassSearchProvider(getPassword);
  Main.overview.viewSelector._searchResults._registerProvider(
    searchProvider
  );
  //Main.overview.addSearchProvider(new PassSearchProvider());
  log("Search provider added");
}

function disable() {
  Main.wm.removeKeybinding("show-menu-keybinding");
  passwordManager.destroy();
  Main.overview.viewSelector._searchResults._unregisterProvider(
    searchProvider
  );
}
