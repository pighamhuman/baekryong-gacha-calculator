package com.bicheon.qa;

import android.app.Activity;
import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.util.Log;
import android.widget.TextView;

import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.Locale;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import dalvik.system.PathClassLoader;

public final class MainActivity extends Activity {
    private static final String TAG = "BICHEON_QA";
    private static final String TARGET_PACKAGE = "com.bicheon.advisor.dev380";
    private static final int PER_CALL_TIMEOUT_SECONDS = 25;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        TextView view = new TextView(this);
        view.setText("Bicheon ART QA running");
        view.setTextSize(20f);
        setContentView(view);

        Thread worker = new Thread(this::runQa, "bicheon-art-qa");
        worker.setDaemon(true);
        worker.start();
    }

    private void runQa() {
        ExecutorService executor = Executors.newSingleThreadExecutor();
        try {
            ApplicationInfo info = getPackageManager().getApplicationInfo(TARGET_PACKAGE, 0);
            Log.i(TAG, "TARGET sourceDir=" + info.sourceDir + " versionCode=" + info.longVersionCode);

            ClassLoader loader = new PathClassLoader(info.sourceDir, getClassLoader());
            Class<?> solverClass = Class.forName("com.bicheon.advisor.Solver", true, loader);
            Method choose = solverClass.getDeclaredMethod(
                    "choose", int[][].class, int[].class, int.class, int.class);
            choose.setAccessible(true);

            int[][] base = new int[][] {
                    {4,1,4,1,2,3,1},
                    {0,3,3,0,4,3,1},
                    {3,2,0,1,0,0,1},
                    {2,4,3,4,0,1,12},
                    {3,12,1,0,2,1,13},
                    {3,1,2,3,2,2,12},
                    {2,1,1,2,3,1,3},
                    {11,12,4,2,1,4,1},
                    {1,12,2,4,1,0,3},
                    {2,4,3,4,2,3,1},
                    {2,1,4,0,0,3,2}
            };

            int[][] pair78 = copyBoard(base);
            pair78[4][1] = 7;
            pair78[4][2] = 8;

            int[][] pair69 = copyBoard(base);
            pair69[3][6] = 6;
            pair69[4][6] = 9;

            int[][] pair88 = copyBoard(base);
            pair88[7][0] = 8;
            pair88[7][1] = 8;

            int[][][] cases = new int[][][] {base, pair78, pair69, pair88};
            String[] names = new String[] {"latest", "pair_7_8", "pair_6_9", "pair_8_8"};
            int completed = 0;

            for (int caseIndex = 0; caseIndex < cases.length; caseIndex++) {
                for (int iteration = 0; iteration < 3; iteration++) {
                    final int[][] board = copyBoard(cases[caseIndex]);
                    final int[] skills = new int[] {0,0,0,0,0};
                    Callable<Object> task = () -> {
                        try {
                            return choose.invoke(null, board, skills, 5, 19);
                        } catch (InvocationTargetException e) {
                            Throwable cause = e.getCause();
                            if (cause instanceof Exception) {
                                throw (Exception) cause;
                            }
                            if (cause instanceof Error) {
                                throw (Error) cause;
                            }
                            throw e;
                        }
                    };

                    long start = System.nanoTime();
                    Future<Object> future = executor.submit(task);
                    Object action;
                    try {
                        action = future.get(PER_CALL_TIMEOUT_SECONDS, TimeUnit.SECONDS);
                    } catch (TimeoutException e) {
                        future.cancel(true);
                        throw new AssertionError("Solver timeout case=" + names[caseIndex]
                                + " iteration=" + iteration, e);
                    }
                    long elapsedMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start);
                    assertAction(action, names[caseIndex], iteration, elapsedMs);
                    completed++;
                }
            }

            Log.i(TAG, "PASS completedCalls=" + completed
                    + " cases=" + cases.length
                    + " repeatedCallsPerCase=3");
        } catch (Throwable t) {
            Log.e(TAG, "FAIL " + t.getClass().getName() + ": " + t.getMessage(), t);
        } finally {
            executor.shutdownNow();
            runOnUiThread(() -> finishAndRemoveTask());
        }
    }

    private static void assertAction(Object action, String caseName, int iteration, long elapsedMs)
            throws Exception {
        if (action == null) {
            throw new AssertionError("Null action case=" + caseName + " iteration=" + iteration);
        }
        Class<?> type = action.getClass();
        Object kind = readField(type, action, "kind");
        double score = ((Number) readField(type, action, "score")).doubleValue();
        int startRow = ((Number) readField(type, action, "startRow")).intValue();
        int startCol = ((Number) readField(type, action, "startCol")).intValue();
        int endRow = ((Number) readField(type, action, "endRow")).intValue();
        int endCol = ((Number) readField(type, action, "endCol")).intValue();

        if (!Double.isFinite(score)) {
            throw new AssertionError("Non-finite score case=" + caseName + " score=" + score);
        }
        String kindText = String.valueOf(kind);
        if ("NONE".equals(kindText)) {
            throw new AssertionError("Unexpected NONE case=" + caseName + " iteration=" + iteration);
        }
        if ("SWAP".equals(kindText)) {
            assertCell(startRow, startCol, "start", caseName);
            assertCell(endRow, endCol, "end", caseName);
            int distance = Math.abs(startRow - endRow) + Math.abs(startCol - endCol);
            if (distance != 1) {
                throw new AssertionError("Non-adjacent SWAP case=" + caseName
                        + " start=" + startRow + "," + startCol
                        + " end=" + endRow + "," + endCol);
            }
        }

        Log.i(TAG, String.format(Locale.US,
                "CALL case=%s iteration=%d elapsedMs=%d kind=%s score=%.2f start=%d,%d end=%d,%d",
                caseName, iteration, elapsedMs, kindText, score,
                startRow, startCol, endRow, endCol));
    }

    private static Object readField(Class<?> type, Object target, String name) throws Exception {
        Field field = type.getDeclaredField(name);
        field.setAccessible(true);
        return field.get(target);
    }

    private static void assertCell(int row, int col, String label, String caseName) {
        if (row < 0 || row >= 11 || col < 0 || col >= 7) {
            throw new AssertionError("Invalid " + label + " coordinate case=" + caseName
                    + " row=" + row + " col=" + col);
        }
    }

    private static int[][] copyBoard(int[][] source) {
        int[][] result = new int[source.length][];
        for (int i = 0; i < source.length; i++) {
            result[i] = source[i].clone();
        }
        return result;
    }
}
