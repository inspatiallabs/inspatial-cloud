import { type InPG, ni } from "../in-pg.ts";

export function setupInvokeImports(inPg: InPG) {
  const wasmLoader = inPg.wasmLoader;
  const stackSave = () => wasmLoader.pgMem.stackSave();
  const getWasmTableEntry = (index: any) => wasmLoader.getWasmTableEntry(index);
  const stackRestore = (val) => wasmLoader.pgMem.stackRestore(val);
  const _setThrew = (one, two) =>
    wasmLoader.callExportFunction("setThrew", one, two);
  function invoke_iii(index, a1, a2) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1, a2);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viiii(index, a1, a2, a3, a4) {
    var sp = stackSave();
    try {
      getWasmTableEntry(index)(a1, a2, a3, a4);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_vi(index, a1) {
    var sp = stackSave();
    try {
      getWasmTableEntry(index)(a1);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_v(index) {
    var sp = stackSave();
    try {
      getWasmTableEntry(index)();
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_j(index) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)();
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
      return 0n;
    }
  }
  function invoke_viiiiii(index, a1, a2, a3, a4, a5, a6) {
    var sp = stackSave();
    try {
      getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_vii(index, a1, a2) {
    var sp = stackSave();
    try {
      getWasmTableEntry(index)(a1, a2);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_iiiiii(index, a1, a2, a3, a4, a5) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1, a2, a3, a4, a5);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_i(index) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)();
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_ii(index, a1) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viii(index, a1, a2, a3) {
    var sp = stackSave();
    try {
      getWasmTableEntry(index)(a1, a2, a3);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_iiii(index, a1, a2, a3) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1, a2, a3);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_vji(index, a1, a2) {
    var sp = stackSave();
    try {
      getWasmTableEntry(index)(a1, a2);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_iiiii(index, a1, a2, a3, a4) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1, a2, a3, a4);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_iiiiiiii(index, a1, a2, a3, a4, a5, a6, a7) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
    var sp = stackSave();
    try {
      getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viiiii(index, a1, a2, a3, a4, a5) {
    var sp = stackSave();
    try {
      getWasmTableEntry(index)(a1, a2, a3, a4, a5);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_jii(index, a1, a2) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1, a2);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
      return 0n;
    }
  }
  function invoke_ji(index, a1) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
      return 0n;
    }
  }
  function invoke_jiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
      return 0n;
    }
  }
  function invoke_jiiiiii(index, a1, a2, a3, a4, a5, a6) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
      return 0n;
    }
  }
  function invoke_iiiiiiiiiiiiii(
    index,
    a1,
    a2,
    a3,
    a4,
    a5,
    a6,
    a7,
    a8,
    a9,
    a10,
    a11,
    a12,
    a13,
  ) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(
        a1,
        a2,
        a3,
        a4,
        a5,
        a6,
        a7,
        a8,
        a9,
        a10,
        a11,
        a12,
        a13,
      );
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_iiiijii(index, a1, a2, a3, a4, a5, a6) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_vijiji(index, a1, a2, a3, a4, a5) {
    var sp = stackSave();
    try {
      getWasmTableEntry(index)(a1, a2, a3, a4, a5);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viji(index, a1, a2, a3) {
    var sp = stackSave();
    try {
      getWasmTableEntry(index)(a1, a2, a3);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_iiji(index, a1, a2, a3) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1, a2, a3);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_iiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_iiiiiiiiiiiiiiiiii(
    index,
    a1,
    a2,
    a3,
    a4,
    a5,
    a6,
    a7,
    a8,
    a9,
    a10,
    a11,
    a12,
    a13,
    a14,
    a15,
    a16,
    a17,
  ) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(
        a1,
        a2,
        a3,
        a4,
        a5,
        a6,
        a7,
        a8,
        a9,
        a10,
        a11,
        a12,
        a13,
        a14,
        a15,
        a16,
        a17,
      );
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_iiiij(index, a1, a2, a3, a4) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1, a2, a3, a4);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_iiiiiii(index, a1, a2, a3, a4, a5, a6) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_vj(index, a1) {
    var sp = stackSave();
    try {
      getWasmTableEntry(index)(a1);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_iiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viiji(index, a1, a2, a3, a4) {
    var sp = stackSave();
    try {
      getWasmTableEntry(index)(a1, a2, a3, a4);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
    var sp = stackSave();
    try {
      getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_vij(index, a1, a2) {
    var sp = stackSave();
    try {
      getWasmTableEntry(index)(a1, a2);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_ij(index, a1) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viiiiiii(index, a1, a2, a3, a4, a5, a6, a7) {
    var sp = stackSave();
    try {
      getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viiiji(index, a1, a2, a3, a4, a5) {
    var sp = stackSave();
    try {
      getWasmTableEntry(index)(a1, a2, a3, a4, a5);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_iiij(index, a1, a2, a3) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1, a2, a3);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_vid(index, a1, a2) {
    var sp = stackSave();
    try {
      getWasmTableEntry(index)(a1, a2);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_ijji(index, a1, a2, a3) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1, a2, a3);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_iijj(index, a1, a2, a3) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1, a2, a3);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_jiii(index, a1, a2, a3) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1, a2, a3);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
      return 0n;
    }
  }
  function invoke_jij(index, a1, a2) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1, a2);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
      return 0n;
    }
  }
  function invoke_ijiiiiii(index, a1, a2, a3, a4, a5, a6, a7) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viijii(index, a1, a2, a3, a4, a5) {
    var sp = stackSave();
    try {
      getWasmTableEntry(index)(a1, a2, a3, a4, a5);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_iiiiiji(index, a1, a2, a3, a4, a5, a6) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viijiiii(index, a1, a2, a3, a4, a5, a6, a7) {
    var sp = stackSave();
    try {
      getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viij(index, a1, a2, a3) {
    var sp = stackSave();
    try {
      getWasmTableEntry(index)(a1, a2, a3);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_viiij(index, a1, a2, a3, a4) {
    var sp = stackSave();
    try {
      getWasmTableEntry(index)(a1, a2, a3, a4);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_vijjii(index, a1, a2, a3, a4, a5) {
    var sp = stackSave();
    try {
      getWasmTableEntry(index)(a1, a2, a3, a4, a5);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_vjii(index, a1, a2, a3) {
    var sp = stackSave();
    try {
      getWasmTableEntry(index)(a1, a2, a3);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_jiiii(index, a1, a2, a3, a4) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1, a2, a3, a4);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
      return 0n;
    }
  }
  function invoke_viiiiiiiiiiii(
    index,
    a1,
    a2,
    a3,
    a4,
    a5,
    a6,
    a7,
    a8,
    a9,
    a10,
    a11,
    a12,
  ) {
    var sp = stackSave();
    try {
      getWasmTableEntry(index)(
        a1,
        a2,
        a3,
        a4,
        a5,
        a6,
        a7,
        a8,
        a9,
        a10,
        a11,
        a12,
      );
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_di(index, a1) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_id(index, a1) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_ijiiiii(index, a1, a2, a3, a4, a5, a6) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  function invoke_iiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
    var sp = stackSave();
    try {
      return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
    }
  }
  const doThis = [
    "emscripten_wget_data",
    "_emscripten_set_offscreencanvas_size",
    "args_sizes_get",
    "args_get",
    "emscripten_notify_memory_growth",
    "__syscall_fchownat",
    "clock_res_get",
    "_emscripten_dlopen_js",
    "emscripten_promise_create",
    "emscripten_promise_resolve",
    "emscripten_promise_destroy",
    "_msync_js",
    "__syscall_fchdir",
    "__syscall_fchmod",
    "__syscall_fchmodat2",
    "__syscall_fchown32",
    "random_get",
    "_emscripten_lookup_name",
    "__syscall_mknodat",
    "__syscall_statfs64",
    "__syscall_fstatfs64",
    "__syscall_utimensat",
    "__syscall_accept4",
    "__syscall_getpeername",
    "__syscall_listen",
    "__syscall_recvmsg",
    "__syscall_sendmsg",
    "_timegm_js",
    "_mktime_js",
    "emscripten_get_heap_max",
  ];
  const other = [
    "getaddrinfo",
    "emscripten_asm_const_int",
    "emscripten_force_exit",
    "getnameinfo",
    "proc_exit",
    "fd_write",
    "fd_read",
    "environ_sizes_get",
    "environ_get",
    "fd_close",
    "__syscall_faccessat",
    "__syscall_chdir",
    "__syscall_chmod",
    "clock_res_get",
    "clock_time_get",
    "__syscall_dup3",
    "_dlopen_js",
    "_emscripten_dlopen_js",
    "emscripten_promise_create",
    "emscripten_promise_resolve",
    "emscripten_promise_destroy",
    "_dlsym_js",
    "_msync_js",

    "__syscall_fdatasync",
    "fd_sync",
    "__syscall_ftruncate64",
    "__syscall_getcwd",
    "__syscall_getdents64",

    "fd_fdstat_get",

    "fd_seek",

    "__syscall_pipe",
    "__syscall_poll",
    "__syscall_fadvise64",
    "__syscall_fallocate",
    "fd_pread",
    "fd_pwrite",
    "__syscall_readlinkat",
    "__syscall_unlinkat",
    "__syscall_rmdir",
    "__syscall_renameat",
    "__syscall__newselect",
    "_emscripten_fs_load_embedded_files",
    "__syscall_symlinkat",
    "_emscripten_system",
    "__syscall_truncate64",
    "__syscall_utimensat",
    "_emscripten_throw_longjmp",

    "__syscall_bind",
    "__syscall_connect",

    "__syscall_getsockname",
    "__syscall_getsockopt",
    "__syscall_listen",
    "__syscall_recvfrom",
    "__syscall_recvmsg",
    "__syscall_sendmsg",
    "__syscall_sendto",
    "__syscall_socket",
  ];
  const imports: Record<string, any> = {};
  // for (const item of invokesList) {
  //   const func = (index, ...params) => {
  //     let sp = stackSave();
  //     try {
  //       return getWasmTableEntry(index)(...params);
  //     } catch (e) {
  //       stackRestore(sp);
  //       if (e !== e + 0) throw e;
  //       _setThrew(1, 0);
  //     }
  //   };
  //   imports[item] = func;
  // }
  for (const item of doThis) {
    imports[item] = (index, ...params) => {
      ni();
    };
  }
  // return imports;
  return {
    invoke_di,
    invoke_i,
    invoke_id,
    invoke_ii,
    invoke_iii,
    invoke_iiii,
    invoke_iiiii,
    invoke_iiiiii,
    invoke_iiiiiii,
    invoke_iiiiiiii,
    invoke_iiiiiiiii,
    invoke_iiiiiiiiii,
    invoke_iiiiiiiiiii,
    invoke_iiiiiiiiiiiiii,
    invoke_iiiiiiiiiiiiiiiiii,
    invoke_iiiiiji,
    invoke_iiiij,
    invoke_iiiijii,
    invoke_iiij,
    invoke_iiji,
    invoke_iijj,
    invoke_ij,
    invoke_ijiiiii,
    invoke_ijiiiiii,
    invoke_ijji,
    invoke_j,
    invoke_ji,
    invoke_jii,
    invoke_jiii,
    invoke_jiiii,
    invoke_jiiiiii,
    invoke_jiiiiiiiii,
    invoke_jij,
    invoke_v,
    invoke_vi,
    invoke_vid,
    invoke_vii,
    invoke_viii,
    invoke_viiii,
    invoke_viiiii,
    invoke_viiiiii,
    invoke_viiiiiii,
    invoke_viiiiiiii,
    invoke_viiiiiiiii,
    invoke_viiiiiiiiiiii,
    invoke_viiij,
    invoke_viiiji,
    invoke_viij,
    invoke_viiji,
    invoke_viijii,
    invoke_viijiiii,
    invoke_vij,
    invoke_viji,
    invoke_vijiji,
    invoke_vijjii,
    invoke_vj,
    invoke_vji,
    invoke_vjii,
  };
}
