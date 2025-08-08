/*
package com.spring.team.websocket;

import javax.websocket.Session;
import java.util.Collection;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

public final class SessionRegistry {
    private static final ConcurrentMap<String, Set<Session>> map = new ConcurrentHashMap<>();

    public static void add(String httpSessId, Session ws) {
        map.computeIfAbsent(httpSessId, k -> ConcurrentHashMap.newKeySet())
                .add(ws);
    }
    public static void remove(Session ws) {
        map.values().forEach(set -> set.remove(ws));
    }
    public static Collection<Session> all() { return map.values()
            .stream()
            .flatMap(Set::stream)
            .toList(); }
}
*/
