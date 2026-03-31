namespace vp.dummy;

// Shared aspect — mix into any entity you want to mark with @dummy
aspect DummyAspect {
  dummyTag   : String(100);
  dummyActive: Boolean default true;
}

