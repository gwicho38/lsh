function cmd_set_hd_profile() {
    // from env/c3
    var cpus = 8;
    var memory = 64000;
    var jvmRatio = 0.5;
    C3.app().nodePool("singlenode").setHardwareProfile(cpus, memory, 0).setJvmSpec(jvmRatio).update();
}