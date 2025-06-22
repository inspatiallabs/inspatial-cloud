import { type InPG, ni } from "../in-pg.ts";

export function setupInvokeImports(inPg: InPG) {
  const wasmLoader = inPg.wasmLoader;
  const unused: Array<string> = [
    "__assert_fail",
    "emscripten_get_now",
    "__syscall_socket",
    "__syscall_getsockopt",
    "__syscall_rmdir",
    "__syscall_fallocate",
    "__syscall_poll",

    "__syscall_newfstatat",
    "__syscall_sendto",
    "__syscall_recvfrom",
    "__syscall_getsockname",
    "__syscall_truncate64",
    "__syscall_symlinkat",
    "__syscall_connect",
    "__syscall_bind",
    "__call_sighandler",
    "_emscripten_runtime_keepalive_clear",
    "__syscall__newselect",
    "_setitimer_js",
    "_gmtime_js",
    "_localtime_js",
    "_munmap_js",
    "__syscall_chmod",
    "_tzset_js",
    "getnameinfo",
    "emscripten_force_exit",
  ];

  const invokesList = [
    "invoke_iii",
    "invoke_di",
    "invoke_i",
    "invoke_id",
    "invoke_ii",
    "invoke_iiii",
    "invoke_iiiii",
    "invoke_iiiiii",
    "invoke_iiiiiii",
    "invoke_iiiiiiii",
    "invoke_iiiiiiiii",
    "invoke_iiiiiiiiii",
    "invoke_iiiiiiiiiii",
    "invoke_iiiiiiiiiiiiii",
    "invoke_iiiiiiiiiiiiiiiiii",
    "invoke_iiiiiji",
    "invoke_iiiij",
    "invoke_iiiijii",
    "invoke_iiij",
    "invoke_iiji",
    "invoke_iijj",
    "invoke_ij",
    "invoke_ijiiiii",
    "invoke_ijiiiiii",
    "invoke_ijji",
    "invoke_j",
    "invoke_ji",
    "invoke_jii",
    "invoke_jiii",
    "invoke_jiiii",
    "invoke_jiiiiii",
    "invoke_jiiiiiiiii",
    "invoke_jij",
    "invoke_v",
    "invoke_vi",
    "invoke_vid",
    "invoke_vii",
    "invoke_viii",
    "invoke_viiii",
    "invoke_viiiii",
    "invoke_viiiiii",
    "invoke_viiiiiii",
    "invoke_viiiiiiii",
    "invoke_viiiiiiiii",
    "invoke_viiiiiiiiiiii",
    "invoke_viiij",
    "invoke_viiiji",
    "invoke_viij",
    "invoke_viiji",
    "invoke_viijii",
    "invoke_viijiiii",
    "invoke_vij",
    "invoke_viji",
    "invoke_vijiji",
    "invoke_vijjii",
    "invoke_vj",
    "invoke_vji",
    "invoke_vjii",
  ];
  const invokes: Record<string, any> = {};
  for (const item of invokesList) {
    const func = (index: number, ...params: any[]) => {
      const getCurrentStack = wasmLoader
        .wasmExports["emscripten_stack_get_current"] as () => number;
      const sp = getCurrentStack();
      try {
        const entry = wasmLoader.getWasmTableEntry(index);
        return entry(...params);
      } catch (e: any) {
        const stackRestore = wasmLoader
          .wasmExports["_emscripten_stack_restore"] as (sp: number) => void;
        stackRestore(sp);
        if (e !== e + 0) throw e;
        const setThrew = wasmLoader
          .wasmExports["setThrew"] as (threw: number, value: number) => void;
        setThrew(1, 0);
      }
    };
    invokes[item] = func;
  }
  const imports: Record<string, any> = {};
  for (const item of unused) {
    imports[item] = () => {
      ni(`${item} is not implemented yet.`);
    };
  }
  // return imports;
  return {
    ...imports,
    ...invokes,
  };
}
