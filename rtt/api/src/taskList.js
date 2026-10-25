// The task lists shown on the form, one per training program, in display order.
// phase is IN (arrival), OUT (departure) or PUSH. A phase with no tasks doesn't appear on the form.
// To add a task: add a line in the right section. To rename one: change its label only.
// Never change or reuse a code once tasks have been logged with it, because saved entries point to it.
// To stop showing a task but keep its history, add  hidden: true  to its line.
module.exports = {
  OJT: [
    // Arrival
    { code: 'arr_beltloader', label: '15/5 belt loader / power stow', phase: 'IN' },
    { code: 'door_shield', label: 'Door shield', phase: 'IN' },
    { code: 'dl_fwd', label: 'Download FWD pit', phase: 'IN' },
    { code: 'dl_aft', label: 'Download AFT pit', phase: 'IN' },
    { code: 'deliver_cag', label: 'Deliver CAG', phase: 'IN' },
    { code: 'run_locals', label: 'Run locals', phase: 'IN' },
    { code: 'nlg_chocks', label: 'NLG chocks', phase: 'IN' },
    { code: 'mlg_chocks', label: 'MLG chocks', phase: 'IN' },
    { code: 'ww_copilot', label: 'WW co-pilot', phase: 'IN' },
    { code: 'ww_captain', label: 'WW captain', phase: 'IN' },
    { code: 'power', label: 'Power', phase: 'IN' },
    { code: 'connect_pca', label: 'Connect PCA', phase: 'IN' },
    { code: 'install_tailstand', label: 'Install tail stand', phase: 'IN' },
    // Departure
    { code: 'water', label: 'Water', phase: 'OUT' },
    { code: 'towbar', label: 'Connect towbar', phase: 'OUT' },
    { code: 'stack_fwd', label: 'Stack FWD', phase: 'OUT' },
    { code: 'stack_aft', label: 'Stack AFT', phase: 'OUT' },
    { code: 'dep_beltloader', label: '15/5 belt loader / power stow', phase: 'OUT' },
    { code: 'uninstall_tailstand', label: 'Uninstall tail stand', phase: 'OUT' },
    { code: 'throw_bags', label: 'Throw bags onto belt loader', phase: 'OUT' },
    { code: 'walkaround', label: 'Walkaround', phase: 'OUT' },
    { code: 'ride_along', label: 'Ride along', phase: 'OUT' },
    { code: 'ww_sendoff', label: 'WW send-off', phase: 'OUT' },
    { code: 'ww_disconnect', label: 'WW disconnect', phase: 'OUT' },
    { code: 'cargo_tags', label: 'Cargo tags', phase: 'OUT' },
    { code: 'collect_cag', label: 'Collect CAG', phase: 'OUT' },
    { code: 'headset', label: 'Connect headset', phase: 'OUT' },
],

  LIT: [
    // Arrival
    { code: 'lit_pitcheck_in', label: 'Pit checks', phase: 'IN' },
    { code: 'lit_downloads', label: 'Downloads', phase: 'IN' },
    { code: 'lit_manual_marshal', label: 'Manual marshal', phase: 'IN' },
    { code: 'lit_safedock_marshal', label: 'Safe dock marshal', phase: 'IN' },
    { code: 'lit_ttc', label: 'TTC', phase: 'IN' },
    { code: 'lit_brief', label: 'Brief', phase: 'IN' },
    { code: 'lit_huddle', label: 'Huddle', phase: 'IN' },
    { code: 'lit_fod_walk', label: 'FOD walk', phase: 'IN' },
    { code: 'lit_tailstand_check', label: 'Tail stand check', phase: 'IN' },
    { code: 'lit_wingwalkers', label: 'Wing walkers in position', phase: 'IN' },
    // Departure
    { code: 'lit_cargo_tags', label: 'Cargo tags', phase: 'OUT' },
    { code: 'lit_milk_runs', label: 'Milk runs', phase: 'OUT' },
    { code: 'lit_hard_copy', label: 'Hard copy', phase: 'OUT' },
    { code: 'lit_hard_count', label: 'Hard count', phase: 'OUT' },
    { code: 'lit_security_checks', label: 'Security checks', phase: 'OUT' },
    { code: 'lit_pitcheck_out', label: 'Pit checks', phase: 'OUT' },
    { code: 'lit_air_start', label: 'Air start', phase: 'OUT' },
    { code: 'lit_uploads', label: 'Uploads', phase: 'OUT' },
    { code: 'lit_avi', label: 'AVI', phase: 'OUT' },
    { code: 'lit_t600', label: 'T600', phase: 'OUT' },
    { code: 'lit_tld_old', label: 'Hooking up old TLD', phase: 'OUT' },
    { code: 'lit_tld_new', label: 'Hooking up new TLD', phase: 'OUT' },
    { code: 'lit_pb', label: 'Hooking up PB', phase: 'OUT' },
    { code: 'lit_notoc_dg', label: 'NOTOC/DG', phase: 'OUT' },
    // Push
    { code: 'lit_push_cg5', label: 'CG5', phase: 'PUSH' },
    { code: 'lit_push_whiskey', label: 'Whiskey push', phase: 'PUSH' },
    { code: 'lit_push_d1c3', label: 'D1/C3', phase: 'PUSH' },
    { code: 'lit_push_deice', label: 'De-Ice line', phase: 'PUSH' },
    { code: 'lit_push_n7', label: 'N7', phase: 'PUSH' },
    { code: 'lit_push_c18', label: 'C18', phase: 'PUSH' },
  ]
};