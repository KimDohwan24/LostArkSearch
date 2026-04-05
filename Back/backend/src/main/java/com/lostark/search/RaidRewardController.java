package com.lostark.search;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/raids")
@CrossOrigin(origins = "*")
public class RaidRewardController {

    @Autowired
    private RaidRewardService raidRewardService;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllRaids() {
        return ResponseEntity.ok(raidRewardService.getAllRaids());
    }

    @GetMapping("/available")
    public ResponseEntity<List<Map<String, Object>>> getAvailableRaids(
            @RequestParam int level) {
        return ResponseEntity.ok(raidRewardService.getAvailableRaids(level));
    }

    @GetMapping("/{name}")
    public ResponseEntity<List<Map<String, Object>>> getRaidsByName(
            @PathVariable String name) {
        List<Map<String, Object>> raids = raidRewardService.getRaidsByName(name);
        if (raids.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(raids);
    }

    @GetMapping("/{name}/summary")
    public ResponseEntity<Map<String, Object>> getRaidSummary(
            @PathVariable String name) {
        Map<String, Object> summary = raidRewardService.getRaidSummary(name);
        if (summary == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/names")
    public ResponseEntity<List<String>> getAllRaidNames() {
        return ResponseEntity.ok(raidRewardService.getAllRaidNames());
    }
}
